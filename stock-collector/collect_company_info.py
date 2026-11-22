"""
기업 기본 정보 수집 스크립트 (pykrx + FinanceDataReader + DART → Supabase)

수집 항목:
  stocks   : sector, listing_date, shares_outstanding,
             foreign_ownership_ratio, capital
  financials (종목별 최신 분기 행 업데이트):
             eps, per, pbr, bps, market_cap, dividend, dividend_yield

데이터 소스:
  - pykrx            : shares_outstanding, market_cap, eps, per, pbr, bps,
                       dividend, dividend_yield, foreign_ownership_ratio
  - FinanceDataReader: sector, listing_date
  - DART             : capital (자본금, 최근 연간 사업보고서)

환경 변수:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DART_API_KEY

실행 주기: 매주 1회 (시장 마감 후)
"""

import io
import os
import time
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime

import FinanceDataReader as fdr
import requests
from pykrx import stock

from _utils import chunked_upsert, fetch_all, fetch_stock_keys, get_last_business_day, get_supabase

supabase = get_supabase()

DART_API_KEY = os.environ.get("DART_API_KEY", "")
DART_BASE_URL = "https://opendart.fss.or.kr/api"
MARKETS = ["KOSPI", "KOSDAQ"]


# ──────────────────────────────────────────────────────────────
# 유틸
# ──────────────────────────────────────────────────────────────

def _int_or_none(val) -> int | None:
    """pandas NaN 또는 0을 None으로 변환."""
    try:
        v = float(val)
        if v != v or v == 0:  # NaN check: v != v
            return None
        return int(v)
    except (TypeError, ValueError):
        return None


def _float_or_none(val) -> float | None:
    """pandas NaN을 None으로 변환."""
    try:
        v = float(val)
        if v != v or v == 0:
            return None
        return round(v, 4)
    except (TypeError, ValueError):
        return None


# ──────────────────────────────────────────────────────────────
# 1. pykrx: 시장 지표 일괄 수집
# ──────────────────────────────────────────────────────────────

def collect_pykrx(date_str: str) -> dict[str, dict]:
    """pykrx로 종목별 시장 지표 수집. 반환: {code: {field: value}}"""
    result: dict[str, dict] = {}

    for market in MARKETS:
        print(f"  [{market}] 시가총액/기본 지표 수집...")
        cap_df = fund_df = foreign_df = None

        try:
            cap_df = stock.get_market_cap_by_ticker(date_str, market=market)
        except Exception as e:
            print(f"    시가총액 실패: {e}")

        try:
            fund_df = stock.get_market_fundamental_by_ticker(date_str, market=market)
        except Exception as e:
            print(f"    기본 지표 실패: {e}")

        print(f"  [{market}] 외국인지분율 수집...")
        try:
            foreign_df = stock.get_exhaustion_rates_of_foreign_investment_by_ticker(
                date_str, date_str, market=market
            )
        except Exception as e:
            print(f"    외국인지분율 실패: {e}")

        if cap_df is not None:
            for code in cap_df.index:
                row = cap_df.loc[code]
                entry = result.setdefault(str(code).zfill(6), {})
                entry["shares_outstanding"] = _int_or_none(row.get("상장주식수"))
                entry["market_cap"] = _int_or_none(row.get("시가총액"))

        if fund_df is not None:
            for code in fund_df.index:
                row = fund_df.loc[code]
                entry = result.setdefault(str(code).zfill(6), {})
                # EPS·PER·BPS·PBR·dividend_yield 는 calculate_ratios.py 가 계산해 저장
                entry["dividend"] = _int_or_none(row.get("DPS"))

        if foreign_df is not None:
            for code in foreign_df.index:
                row = foreign_df.loc[code]
                entry = result.setdefault(str(code).zfill(6), {})
                entry["foreign_ownership_ratio"] = _float_or_none(row.get("지분율"))

    print(f"  pykrx 완료: {len(result)}개 종목")
    return result


# ──────────────────────────────────────────────────────────────
# 2. FinanceDataReader: 업종 / 상장일
# ──────────────────────────────────────────────────────────────

# StockListing 컬럼명이 버전·마켓마다 다를 수 있어 후보 목록으로 탐색한다.
_SECTOR_COLS = ("Sector", "업종", "Industry", "Dept")
_DATE_COLS = ("ListingDate", "상장일", "Listing", "IPOdate")


def collect_listing_info() -> dict[str, dict]:
    """업종(sector)과 상장일(listing_date) 수집. 반환: {code: {field: value}}"""
    result: dict[str, dict] = {}

    for market in MARKETS:
        print(f"  [{market}] 상장 정보 수집...")
        try:
            df = fdr.StockListing(market)
        except Exception as e:
            print(f"    FDR 실패: {e}")
            continue

        for _, row in df.iterrows():
            raw = row.get("Code") or row.get("code") or ""
            code = str(raw).zfill(6)
            if not code or code == "000000":
                continue

            entry = result.setdefault(code, {})

            for col in _SECTOR_COLS:
                val = row.get(col)
                if val and str(val).strip() not in ("", "nan", "None"):
                    entry["sector"] = str(val).strip()
                    break

            for col in _DATE_COLS:
                val = row.get(col)
                if val is None:
                    continue
                if hasattr(val, "strftime"):
                    entry["listing_date"] = val.strftime("%Y-%m-%d")
                    break
                s = str(val).strip()
                if s and s not in ("", "nan", "None", "NaT"):
                    entry["listing_date"] = s
                    break

    print(f"  FDR 완료: {len(result)}개 종목")
    return result


# ──────────────────────────────────────────────────────────────
# 3. DART: 자본금
# ──────────────────────────────────────────────────────────────

def _get_corp_list() -> list[dict]:
    url = f"{DART_BASE_URL}/corpCode.xml"
    res = requests.get(url, params={"crtfc_key": DART_API_KEY}, timeout=30)
    z = zipfile.ZipFile(io.BytesIO(res.content))
    root = ET.fromstring(z.read("CORPCODE.xml"))
    corps = []
    for item in root.findall("list"):
        stock_code = item.findtext("stock_code", "").strip()
        if stock_code:
            corps.append({
                "corp_code": item.findtext("corp_code", "").strip(),
                "corp_name": item.findtext("corp_name", "").strip(),
                "stock_code": stock_code,
            })
    return corps


def _get_capital(corp_code: str, year: int) -> int | None:
    """DART 사업보고서에서 자본금(원) 추출. 연결재무제표 → 별도재무제표 순으로 시도."""
    for fs_div in ("CFS", "OFS"):
        try:
            res = requests.get(
                f"{DART_BASE_URL}/fnlttSinglAcnt.json",
                params={
                    "crtfc_key": DART_API_KEY,
                    "corp_code": corp_code,
                    "bsns_year": str(year),
                    "reprt_code": "11011",  # 사업보고서(연간)
                    "fs_div": fs_div,
                },
                timeout=10,
            )
            data = res.json()
            if data.get("status") != "000":
                continue
            for item in data.get("list", []):
                if item.get("account_nm") == "자본금":
                    val = item.get("thstrm_amount", "").replace(",", "").strip()
                    if val:
                        return int(val)
        except Exception:
            pass
    return None


def collect_dart_capital() -> dict[str, int]:
    """DART에서 전 상장사의 최근 연간 자본금 수집. 반환: {stock_code: capital}"""
    if not DART_API_KEY:
        print("  DART_API_KEY 미설정 — 자본금 수집 건너뜀")
        return {}

    corps = _get_corp_list()
    year = datetime.now().year - 1  # 직전 사업연도
    print(f"  DART 상장사 {len(corps)}개 자본금 수집 (기준연도: {year})...")

    result: dict[str, int] = {}
    total = len(corps)
    for i, corp in enumerate(corps, 1):
        capital = _get_capital(corp["corp_code"], year)
        if capital:
            result[corp["stock_code"].zfill(6)] = capital
        if i % 200 == 0:
            print(f"    [{i}/{total}]")
        time.sleep(0.1)

    print(f"  DART 완료: {len(result)}개 자본금 수집")
    return result


# ──────────────────────────────────────────────────────────────
# 4. DB 업데이트
# ──────────────────────────────────────────────────────────────

def _get_latest_quarters() -> dict[str, tuple[int, int]]:
    """financials 테이블에서 종목별 최신 (year, quarter)."""
    latest: dict[str, tuple[int, int]] = {}
    for row in fetch_all(supabase, "financials", "stock_code, year, quarter"):
        code = row["stock_code"]
        yq = (row["year"], row["quarter"])
        if code not in latest or yq > latest[code]:
            latest[code] = yq
    return latest


def run_stocks_update(
    pykrx_data: dict[str, dict],
    listing_data: dict[str, dict],
    dart_capital: dict[str, int],
) -> None:
    # stocks upsert 는 NOT NULL(name, market)을 먼저 검사하므로 기존 종목만, 두 값을 포함해 갱신
    keys = fetch_stock_keys(supabase)
    all_codes = (set(pykrx_data) | set(listing_data) | set(dart_capital)) & set(keys)
    rows = []
    for code in all_codes:
        row: dict = {"code": code, **keys[code]}
        pd_ = pykrx_data.get(code, {})
        ld = listing_data.get(code, {})

        for field in ("shares_outstanding", "foreign_ownership_ratio"):
            if pd_.get(field) is not None:
                row[field] = pd_[field]
        if ld.get("sector"):
            row["sector"] = ld["sector"]
        if ld.get("listing_date"):
            row["listing_date"] = ld["listing_date"]
        if code in dart_capital:
            row["capital"] = dart_capital[code]

        if len(row) > 3:
            rows.append(row)

    if rows:
        chunked_upsert(supabase, "stocks", rows, on_conflict="code")
        print(f"[stocks] {len(rows)}개 종목 업데이트 완료")
    else:
        print("[stocks] 업데이트할 데이터 없음")


_FINANCIAL_FIELDS = ("dividend",)  # 나머지 비율은 calculate_ratios.py 가 계산해 저장


def run_financials_update(pykrx_data: dict[str, dict]) -> None:
    latest_quarters = _get_latest_quarters()
    rows = []
    for code, market_data in pykrx_data.items():
        if code not in latest_quarters:
            continue
        year, quarter = latest_quarters[code]
        row: dict = {"stock_code": code, "year": year, "quarter": quarter}
        for f in _FINANCIAL_FIELDS:
            if market_data.get(f) is not None:
                row[f] = market_data[f]
        if len(row) > 3:
            rows.append(row)

    if rows:
        chunked_upsert(
            supabase, "financials", rows, on_conflict="stock_code,year,quarter"
        )
        print(f"[financials] {len(rows)}개 행 업데이트 완료")
    else:
        print("[financials] 업데이트할 데이터 없음")


# ──────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────

def main() -> None:
    print("=== 기업 기본 정보 수집 시작 ===")
    date = get_last_business_day()
    date_str = date.strftime("%Y%m%d")
    print(f"기준일: {date.strftime('%Y-%m-%d')}")

    print("\n[1/3] pykrx 시장 지표 수집")
    pykrx_data = collect_pykrx(date_str)

    print("\n[2/3] FinanceDataReader 상장 정보 수집")
    listing_data = collect_listing_info()

    print("\n[3/3] DART 자본금 수집")
    dart_capital = collect_dart_capital()

    print("\n=== DB 업데이트 ===")
    run_stocks_update(pykrx_data, listing_data, dart_capital)
    run_financials_update(pykrx_data)

    print("\n완료!")


if __name__ == "__main__":
    main()
