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

from _utils import fetch_stock_codes, get_supabase

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


def extract_amount(items: list, account_names: list):
    """계정과목명 목록 중 첫 매칭 항목의 당기 금액(thstrm_amount)을 정수로 반환"""
    for item in items:
        if item.get("account_nm") in account_names:
            val = item.get("thstrm_amount", "").replace(",", "").strip()
            try:
                return int(val)
            except (ValueError, TypeError):
                pass
    return None


def parse_financials(stock_code: str, year: int, quarter: int, items: list):
    """재무제표 raw 항목에서 손익·재무상태표 항목을 추출하여 dict로 반환"""
    revenue = extract_amount(items, ["매출액", "수익(매출액)"])
    operating_profit = extract_amount(items, ["영업이익", "영업이익(손실)"])
    net_income = extract_amount(items, ["당기순이익", "당기순이익(손실)"])
    equity = extract_amount(items, ["자본총계"])
    total_assets = extract_amount(items, ["자산총계"])

    operating_margin = None
    if revenue and operating_profit and revenue != 0:
        operating_margin = round(operating_profit / revenue * 100, 2)

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
        for year, quarter in targets:
            items = get_financial_data(corp_code, year, quarter)
            if items:
                row = parse_financials(stock_code, year, quarter, items)
                rows.append(row)
            time.sleep(0.2)  # API 요청 제한 방지

        if rows:
            supabase.table("financials").upsert(
                rows, on_conflict="stock_code,year,quarter"
            ).execute()

    print("완료!")


if __name__ == "__main__":
    main()
