"""
상장사 분기별 재무 정보 수집 (DART OpenAPI → Supabase)
"""

import os
import time
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

DART_API_KEY = os.environ["DART_API_KEY"]
DART_BASE_URL = "https://opendart.fss.or.kr/api"

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

# 분기 → DART 보고서 코드
REPRT_CODE_MAP = {1: "11013", 2: "11012", 3: "11014", 4: "11011"}


def get_corp_list():
    """DART 상장사 목록 (고유번호 → 종목코드 매핑)"""
    import zipfile
    import xml.etree.ElementTree as ET
    import io

    url = f"{DART_BASE_URL}/corpCode.xml"
    res = requests.get(url, params={"crtfc_key": DART_API_KEY})
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
    res = requests.get(url, params=params)
    data = res.json()

    if data.get("status") != "000":
        return None

    return data.get("list", [])


def extract_amount(items: list, account_names: list):
    """계정과목명으로 금액 추출 (첫 번째 매칭)"""
    for item in items:
        if item.get("account_nm") in account_names:
            val = item.get("thstrm_amount", "").replace(",", "").strip()
            try:
                return int(val)
            except (ValueError, TypeError):
                pass
    return None


def parse_financials(stock_code: str, year: int, quarter: int, items: list):
    """재무제표 항목 파싱"""
    revenue = extract_amount(items, ["매출액", "수익(매출액)"])
    operating_profit = extract_amount(items, ["영업이익", "영업이익(손실)"])
    net_income = extract_amount(items, ["당기순이익", "당기순이익(손실)"])

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

    corps = get_corp_list()
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
