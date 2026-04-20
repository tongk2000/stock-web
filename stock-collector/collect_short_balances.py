"""공매도 잔고 수집 스크립트 (pykrx → Supabase).

KRX 는 공매도 잔고를 **T+2 영업일 18:00 KST** 에 공시한다. 따라서
평일 18:10 KST 에 1차 수집, 20:00 KST 에 누락분 재수집으로 운영한다.

모드:
  --mode daily    : 오늘 기준 T-2 영업일 1일치 수집 (기본 cron)
  --mode retry    : 최근 5영업일 중 short_balances 에 행이 전혀 없는 날짜만 재수집
  --mode backfill : 최근 365일(≈1년) 치를 날짜별로 일괄 수집 (최초 1회)

환경 변수:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
from datetime import datetime, timedelta

from pykrx import stock

from _utils import (
    chunked_upsert,
    get_last_business_day,
    get_supabase,
    prev_business_day,
    recent_business_days,
)

supabase = get_supabase()

MARKETS = ("KOSPI", "KOSDAQ")


def _iso(yyyymmdd: str) -> str:
    return f"{yyyymmdd[:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:]}"


def fetch_rows(yyyymmdd: str) -> list[dict]:
    """해당 일자의 KOSPI+KOSDAQ 공매도 잔고 rows 반환. 없으면 빈 리스트."""
    iso = _iso(yyyymmdd)
    rows: list[dict] = []
    for market in MARKETS:
        try:
            df = stock.get_shorting_balance_by_ticker(
                fromdate=yyyymmdd, todate=yyyymmdd, market=market
            )
        except Exception as e:
            print(f"  [{yyyymmdd}:{market}] API 오류: {e}")
            continue

        if df is None or df.empty:
            continue

        for ticker, row in df.iterrows():
            rows.append({
                "stock_code": str(ticker).zfill(6),
                "date": iso,
                "balance_qty": int(row["공매도잔고"]),
                "listed_shares": int(row["상장주식수"]),
                "balance_amt": int(row["공매도금액"]),
                "balance_ratio": float(row["비중"]),
            })
    return rows


def collect_one_date(yyyymmdd: str) -> int:
    """단일 일자 수집 후 upsert. upsert 한 행 수 반환."""
    rows = fetch_rows(yyyymmdd)
    if not rows:
        print(f"  [{yyyymmdd}] 데이터 없음 (공시 전이거나 휴장일)")
        return 0
    chunked_upsert(supabase, "short_balances", rows, on_conflict="stock_code,date")
    print(f"  [{yyyymmdd}] {len(rows)}건 upsert")
    return len(rows)


def target_date_for_daily() -> str:
    """오늘 기준 T-2 영업일을 YYYYMMDD 로."""
    today = get_last_business_day()
    d = prev_business_day(today, 2)
    return d.strftime("%Y%m%d")


def missing_business_days(days_back: int = 5) -> list[str]:
    """최근 days_back 영업일 중 short_balances 에 해당 날짜 행이 0건인 날짜 목록 (YYYYMMDD)."""
    # T-2 영업일이 가장 최신 데이터이므로 거기부터 과거로 days_back 개.
    latest = prev_business_day(get_last_business_day(), 2)
    candidates = recent_business_days(days_back, ref=latest)

    missing: list[str] = []
    for d in candidates:
        iso = d.strftime("%Y-%m-%d")
        res = (
            supabase.table("short_balances")
            .select("stock_code", count="exact", head=True)
            .eq("date", iso)
            .execute()
        )
        if (res.count or 0) == 0:
            missing.append(d.strftime("%Y%m%d"))
    return missing


def run_daily() -> None:
    target = target_date_for_daily()
    print(f"[daily] 대상 일자: {target}")
    collect_one_date(target)


def run_retry() -> None:
    missing = missing_business_days(days_back=5)
    if not missing:
        print("[retry] 누락된 날짜 없음")
        return
    print(f"[retry] 누락 일자: {missing}")
    for ymd in missing:
        collect_one_date(ymd)


def run_backfill(days: int = 365) -> None:
    """오늘 기준 T-2 영업일에서 과거로 영업일 기준 최대 `days` 일(역산) 수집."""
    start = prev_business_day(get_last_business_day(), 2)
    cutoff = datetime.now() - timedelta(days=days)
    print(f"[backfill] {cutoff.strftime('%Y-%m-%d')} ~ {start.strftime('%Y-%m-%d')}")

    d = start
    while d >= cutoff:
        if d.weekday() < 5:
            collect_one_date(d.strftime("%Y%m%d"))
        d -= timedelta(days=1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["daily", "retry", "backfill"], default="daily")
    parser.add_argument(
        "--days",
        type=int,
        default=365,
        help="backfill 모드에서 수집할 일수 (기본 365)",
    )
    args = parser.parse_args()

    if args.mode == "daily":
        run_daily()
    elif args.mode == "retry":
        run_retry()
    else:
        run_backfill(days=args.days)

    print("완료!")


if __name__ == "__main__":
    main()
