"""
상장사 분기별 재무 정보 수집 스크립트 (DART OpenAPI → Supabase)

최근 4분기의 연결재무제표에서 매출액·영업이익·당기순이익을 추출하여
financials 테이블에 저장합니다.

흐름:
  1. DART 상장사 목록(corpCode.xml) 다운로드
  2. 최근 4분기 대상 분기 계산
  3. 각 기업별·분기별 재무제표 조회 (fnlttSinglAcnt API)
  4. 매출/영업이익/순이익/영업이익률 파싱 후 upsert

환경 변수:
  - SUPABASE_URL              : Supabase 프로젝트 URL
  - SUPABASE_SERVICE_ROLE_KEY  : service_role 키
  - DART_API_KEY               : DART OpenAPI 인증키
"""

import os
import time
import requests
from datetime import datetime

from _utils import fetch_stock_codes, fit_numeric, get_supabase

supabase = get_supabase()

DART_API_KEY = os.environ["DART_API_KEY"]
DART_BASE_URL = "https://opendart.fss.or.kr/api"

# 분기 → DART 보고서 코드
REPRT_CODE_MAP = {1: "11013", 2: "11012", 3: "11014", 4: "11011"}


def get_corp_list():
    """DART 상장사 목록 다운로드 (고유번호 → 종목코드 매핑). ZIP → XML 파싱."""
    import zipfile
    import xml.etree.ElementTree as ET
    import io

    url = f"{DART_BASE_URL}/corpCode.xml"
    res = requests.get(url, params={"crtfc_key": DART_API_KEY}, timeout=30)
    z = zipfile.ZipFile(io.BytesIO(res.content))
    xml_data = z.read("CORPCODE.xml")
    root = ET.fromstring(xml_data)

    corps = []
    for item in root.findall("list"):
        stock_code = item.findtext("stock_code", "").strip()
        if stock_code:  # 상장사만
            corps.append({
                "corp_code": item.findtext("corp_code", "").strip(),
                "corp_name": item.findtext("corp_name", "").strip(),
                "stock_code": stock_code,
            })
    return corps


def get_financial_data(corp_code: str, year: int, quarter: int):
    """단일 회사 분기 재무제표 조회"""
    url = f"{DART_BASE_URL}/fnlttSinglAcnt.json"
    params = {
        "crtfc_key": DART_API_KEY,
        "corp_code": corp_code,
        "bsns_year": str(year),
        "reprt_code": REPRT_CODE_MAP[quarter],
        "fs_div": "CFS",  # 연결재무제표
    }
    # 타임아웃이 없으면 응답 없는 요청 하나에 잡혀 Actions 6시간 제한으로 취소된다
    try:
        data = requests.get(url, params=params, timeout=10).json()
    except (requests.RequestException, ValueError):
        return None

    if data.get("status") != "000":
        return None

    return data.get("list", [])


NET_INCOME_NAMES = ["당기순이익", "당기순이익(손실)"]


def extract_amount(items: list, account_names: list, field: str = "thstrm_amount"):
    """계정과목명 목록 중 첫 매칭 항목의 금액(기본: 당기 금액 thstrm_amount)을 정수로 반환"""
    for item in items:
        if item.get("account_nm") in account_names:
            val = (item.get(field) or "").replace(",", "").strip()
            try:
                return int(val)
            except (ValueError, TypeError):
                pass
    return None


def parse_financials(stock_code: str, year: int, quarter: int, items: list):
    """재무제표 raw 항목에서 손익·재무상태표 항목을 추출하여 dict로 반환"""
    revenue = extract_amount(items, ["매출액", "수익(매출액)"])
    operating_profit = extract_amount(items, ["영업이익", "영업이익(손실)"])
    net_income = extract_amount(items, NET_INCOME_NAMES)
    equity = extract_amount(items, ["자본총계"])
    total_assets = extract_amount(items, ["자산총계"])

    operating_margin = None
    if revenue and operating_profit and revenue != 0:
        operating_margin = fit_numeric(round(operating_profit / revenue * 100, 2), 4)  # numeric(6,2)

    return {
        "stock_code": stock_code,
        "year": year,
        "quarter": quarter,
        "revenue": revenue,
        "operating_profit": operating_profit,
        "net_income": net_income,
        "operating_margin": operating_margin,
        "equity": equity,
        "total_assets": total_assets,
    }


def net_income_ytd(items: list, quarter: int) -> tuple[int | None, int | None]:
    """분기·반기 보고서의 (당기 누적, 전기 같은 기간 누적) 당기순이익.

    Q1~Q3 보고서의 thstrm_amount 는 3개월치, Q4(사업보고서)는 연간치라 최신 행 하나로
    PER·ROE 를 내면 분기 실적으로 계산된다. 누적값은 TTM 계산에 쓴다.
    Q1 은 누적 = 3개월이라 누적 필드가 비어 있으면 당기/전기 금액으로 대신한다.
    """
    ytd = extract_amount(items, NET_INCOME_NAMES, "thstrm_add_amount")
    prev_ytd = extract_amount(items, NET_INCOME_NAMES, "frmtrm_add_amount")
    if quarter == 1:
        ytd = ytd if ytd is not None else extract_amount(items, NET_INCOME_NAMES, "thstrm_amount")
        prev_ytd = prev_ytd if prev_ytd is not None else extract_amount(items, NET_INCOME_NAMES, "frmtrm_amount")
    return ytd, prev_ytd


def trailing_net_income(rows: list[dict], ytd: dict[tuple[int, int], tuple]) -> int | None:
    """rows(최신 분기부터)의 첫 행 기준 최근 4분기(TTM) 당기순이익.

    최신이 Q4 면 연간치 그대로, 아니면 전년 연간 + 올해 누적 − 전년 같은 기간 누적.
    전년 사업보고서가 없거나 누적값이 비면 None (분기치로 대신 계산하지 않는다).
    """
    latest = rows[0]
    year, quarter = latest["year"], latest["quarter"]
    if quarter == 4:
        return latest["net_income"]
    annual = next(
        (r["net_income"] for r in rows if r["year"] == year - 1 and r["quarter"] == 4),
        None,
    )
    cur_ytd, prev_ytd = ytd.get((year, quarter), (None, None))
    if annual is None or cur_ytd is None or prev_ytd is None:
        return None
    return annual + cur_ytd - prev_ytd


def get_target_quarters():
    """최근 4분기 (연도, 분기) 목록"""
    now = datetime.now()
    quarter = (now.month - 1) // 3
    year = now.year
    if quarter == 0:
        year -= 1
        quarter = 4

    targets = []
    for _ in range(4):
        targets.append((year, quarter))
        quarter -= 1
        if quarter == 0:
            year -= 1
            quarter = 4
    return targets


def main():
    targets = get_target_quarters()
    print(f"수집 대상 분기: {targets}")

    # stocks 에 없는 종목을 upsert 하면 financials_stock_code_fkey 위반으로 전체가 중단된다
    known_codes = fetch_stock_codes(supabase)
    corps = [c for c in get_corp_list() if c["stock_code"] in known_codes]
    print(f"상장사 {len(corps)}개")

    total = len(corps)
    for i, corp in enumerate(corps, 1):
        stock_code = corp["stock_code"]
        corp_code = corp["corp_code"]
        name = corp["corp_name"]
        print(f"[{i}/{total}] {name}({stock_code})")

        rows = []
        ytd: dict[tuple[int, int], tuple] = {}
        for year, quarter in targets:
            items = get_financial_data(corp_code, year, quarter)
            if items:
                rows.append(parse_financials(stock_code, year, quarter, items))
                ytd[(year, quarter)] = net_income_ytd(items, quarter)
            time.sleep(0.2)  # API 요청 제한 방지

        if rows:
            # 모든 행이 같은 키를 갖게 한다(빠진 키는 NULL 로 덮인다). TTM 은 최신 행에만 의미가 있다
            ttm = fit_numeric(trailing_net_income(rows, ytd), 18)  # bigint
            for idx, row in enumerate(rows):
                row["net_income_ttm"] = ttm if idx == 0 else None
            supabase.table("financials").upsert(
                rows, on_conflict="stock_code,year,quarter"
            ).execute()

    print("완료!")


if __name__ == "__main__":
    main()
