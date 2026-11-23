"""공매도 일별 체결·신용잔고 수집 (한국투자증권 Open API → Supabase).

KRX 정보데이터시스템은 로그인을 요구하고 KRX Open API에는 공매도·신용 서비스가 없어
KIS 실전 키로 종목마다 두 TR을 부른다.
  - 공매도 일별추이 FHPST04830000: 기간(시작~끝) 지정, 한 번에 최대 100영업일
  - 신용잔고 일별추이 FHPST04760000: 기준일부터 거꾸로 30영업일

모드:
  --mode daily    : 공매도 최근 14일, 신용잔고 최근 30영업일(각 종목 1회씩)
  --mode backfill : 최근 365일

환경 변수:
  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  - KIS_APP_KEY, KIS_APP_SECRET (실전 계좌 앱키)
"""

import argparse
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

import requests

from _utils import chunked_upsert, fetch_stock_codes, fit_numeric, get_supabase

supabase = get_supabase()

BASE = "https://openapi.koreainvestment.com:9443"
# KIS 실전 키는 초당 20건. 여유를 두고 15건으로 맞춘다
RATE_PER_SEC = 15
FETCH_WORKERS = 8
UPSERT_BATCH = 1000
SHORT_WINDOW_DAYS = 130   # 100영업일 응답 한도 안쪽의 달력일 창
CREDIT_PAGE = 30


class RateLimiter:
    """스레드 공용 초당 호출 제한."""

    def __init__(self, per_sec: int):
        self.interval = 1.0 / per_sec
        self.lock = threading.Lock()
        self.next_at = 0.0

    def wait(self) -> None:
        with self.lock:
            now = time.monotonic()
            at = max(now, self.next_at)
            self.next_at = at + self.interval
        if at > now:
            time.sleep(at - now)


limiter = RateLimiter(RATE_PER_SEC)


def issue_token(key: str, secret: str) -> str:
    """접근 토큰 발급(24시간 유효, 1분에 1회만 발급된다)."""
    res = requests.post(
        f"{BASE}/oauth2/tokenP",
        json={"grant_type": "client_credentials", "appkey": key, "appsecret": secret},
        timeout=20,
    )
    res.raise_for_status()
    return res.json()["access_token"]


def make_headers() -> dict:
    key = os.environ["KIS_APP_KEY"]
    secret = os.environ["KIS_APP_SECRET"]
    return {
        "authorization": f"Bearer {issue_token(key, secret)}",
        "appkey": key,
        "appsecret": secret,
        "custtype": "P",
    }


def kis_get(headers: dict, path: str, tr_id: str, params: dict) -> dict | None:
    """GET 한 번. 초당 한도 초과(EGW00201)는 쉬고 다시 부른다. 실패하면 None."""
    for attempt in range(4):
        limiter.wait()
        try:
            res = requests.get(
                f"{BASE}{path}", headers={**headers, "tr_id": tr_id}, params=params, timeout=10
            )
            data = res.json()
        except Exception as e:
            print(f"  [{tr_id}] 요청 오류: {e}")
            time.sleep(1 + attempt)
            continue
        if data.get("rt_cd") == "0":
            return data
        if data.get("msg_cd") == "EGW00201":
            time.sleep(1 + attempt)
            continue
        print(f"  [{tr_id} {params}] {data.get('msg_cd')} {data.get('msg1')}")
        return None
    return None


def _int(v) -> int | None:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _float(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _iso(yyyymmdd: str) -> str:
    return f"{yyyymmdd[:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:]}"


def fetch_short(headers: dict, code: str, start: datetime, end: datetime) -> list[dict]:
    """[start, end] 공매도 일별 체결. 창을 SHORT_WINDOW_DAYS씩 나눠 부른다."""
    rows: dict[str, dict] = {}
    cur_end = end
    while cur_end >= start:
        cur_start = max(start, cur_end - timedelta(days=SHORT_WINDOW_DAYS))
        data = kis_get(headers, "/uapi/domestic-stock/v1/quotations/daily-short-sale", "FHPST04830000", {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": code,
            "FID_INPUT_DATE_1": cur_start.strftime("%Y%m%d"),
            "FID_INPUT_DATE_2": cur_end.strftime("%Y%m%d"),
        })
        for o in (data or {}).get("output2") or []:
            d = o.get("stck_bsop_date")
            if not d:
                continue
            rows[d] = {
                "stock_code": code,
                "date": _iso(d),
                "short_volume": _int(o.get("ssts_cntg_qty")),
                "short_value": _int(o.get("ssts_tr_pbmn")),
                "short_volume_ratio": fit_numeric(_float(o.get("ssts_vol_rlim")), 4),
                "short_value_ratio": fit_numeric(_float(o.get("ssts_tr_pbmn_rlim")), 4),
            }
        cur_end = cur_start - timedelta(days=1)
    return list(rows.values())


def fetch_credit(headers: dict, code: str, start: datetime, end: datetime) -> list[dict]:
    """[start, end] 신용잔고 일별. 기준일부터 30영업일씩 거꾸로 넘긴다."""
    rows: dict[str, dict] = {}
    cur = end
    while cur >= start:
        data = kis_get(headers, "/uapi/domestic-stock/v1/quotations/daily-credit-balance", "FHPST04760000", {
            "fid_cond_mrkt_div_code": "J",
            "fid_cond_scr_div_code": "20476",
            "fid_input_iscd": code,
            "fid_input_date_1": cur.strftime("%Y%m%d"),
        })
        out = (data or {}).get("output") or []
        dates = []
        for o in out:
            d = o.get("deal_date")
            if not d:
                continue
            dates.append(d)
            if d < start.strftime("%Y%m%d"):
                continue
            amount = _int(o.get("whol_loan_rmnd_amt"))
            rows[d] = {
                "stock_code": code,
                "date": _iso(d),
                "loan_balance_shares": _int(o.get("whol_loan_rmnd_stcn")),
                # 금액 단위는 만원(삼성전자 잔고 수량×평균단가로 맞춰 봄)
                "loan_balance_amount": amount * 10000 if amount is not None else None,
                "loan_balance_rate": fit_numeric(_float(o.get("whol_loan_rmnd_rate")), 4),
                "loan_new_shares": _int(o.get("whol_loan_new_stcn")),
                "loan_repay_shares": _int(o.get("whol_loan_rdmp_stcn")),
                "lend_balance_shares": _int(o.get("whol_stln_rmnd_stcn")),
            }
        if len(out) < CREDIT_PAGE or not dates:
            break
        cur = datetime.strptime(min(dates), "%Y%m%d") - timedelta(days=1)
    return list(rows.values())


def run(mode: str) -> None:
    headers = make_headers()
    codes = sorted(fetch_stock_codes(supabase))
    end = datetime.now()
    if mode == "backfill":
        short_start = credit_start = end - timedelta(days=365)
    else:
        short_start = end - timedelta(days=14)
        credit_start = end - timedelta(days=45)
    print(f"[{mode}] 종목 {len(codes)}개, 공매도 {short_start:%Y-%m-%d}~, 신용 {credit_start:%Y-%m-%d}~")

    def job(code: str) -> tuple[list[dict], list[dict]]:
        return (
            fetch_short(headers, code, short_start, end),
            fetch_credit(headers, code, credit_start, end),
        )

    short_buf: list[dict] = []
    credit_buf: list[dict] = []
    totals = [0, 0]
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        futures = {pool.submit(job, c): c for c in codes}
        for done, fut in enumerate(as_completed(futures), 1):
            s, c = fut.result()
            short_buf.extend(s)
            credit_buf.extend(c)
            totals[0] += len(s)
            totals[1] += len(c)
            if len(short_buf) >= UPSERT_BATCH:
                chunked_upsert(supabase, "short_sales", short_buf, on_conflict="stock_code,date")
                short_buf = []
            if len(credit_buf) >= UPSERT_BATCH:
                chunked_upsert(supabase, "credit_balances", credit_buf, on_conflict="stock_code,date")
                credit_buf = []
            if done % 200 == 0:
                print(f"  [{done}/{len(codes)}] 공매도 {totals[0]}행, 신용 {totals[1]}행")
    chunked_upsert(supabase, "short_sales", short_buf, on_conflict="stock_code,date")
    chunked_upsert(supabase, "credit_balances", credit_buf, on_conflict="stock_code,date")
    print(f"완료: 공매도 {totals[0]}행, 신용잔고 {totals[1]}행")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["daily", "backfill"], default="daily")
    run(parser.parse_args().mode)
