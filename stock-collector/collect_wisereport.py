"""
기업 개요 보강 스크립트 (WiseReport 기업모니터 → Supabase)

collect_company_info.py(pykrx·FDR·DART)가 채우지 못하는 항목을
Naver 증권이 쓰는 WiseReport 기업모니터 페이지에서 종목별로 수집합니다.

수집 항목:
  stocks     : face_value(액면가), float_shares(발행주식수 × 유동비율),
               description(기업개요), listing_date(상장일),
               shares_outstanding(발행주식수, pykrx 실패 대비)
  financials : ev_ebitda (최근 결산 실적, 종목별 최신 분기 행에 기록)

페이지:
  c1010001 : 시세정보(액면가, 발행주식수/유동비율), 기업개요, 펀더멘털(EV/EBITDA)
  c1020001 : 기업개요 상세(상장일)

환경 변수:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

실행 주기: 매주 1회 (collect_company_info.py 직후)
"""

import re
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

from _utils import chunked_upsert, fetch_all, fetch_stock_keys, fit_numeric, get_supabase

supabase = get_supabase()

BASE_URL = "https://navercomp.wisereport.co.kr/v2/company"
HEADERS = {"User-Agent": "Mozilla/5.0"}
FETCH_WORKERS = 8


# ──────────────────────────────────────────────────────────────
# 파싱
# ──────────────────────────────────────────────────────────────

def _num(text: str | None) -> float | None:
    """'62,843,910주' / '54.91%' / '100원' → 숫자. 실패 시 None."""
    if not text:
        return None
    m = re.search(r"-?[\d,]+(?:\.\d+)?", text)
    if not m:
        return None
    try:
        return float(m.group().replace(",", ""))
    except ValueError:
        return None


def _row_value(soup: BeautifulSoup, label: str) -> str | None:
    """<th>label</th><td>값</td> 형태의 첫 번째 td 텍스트."""
    th = soup.find("th", string=lambda s: s and s.strip() == label)
    td = th.find_next_sibling("td") if th else None
    return " ".join(td.get_text(" ", strip=True).split()) if td else None


def parse_main(html: str) -> dict:
    """c1010001: 액면가, 발행주식수/유동비율, 기업개요, EV/EBITDA."""
    soup = BeautifulSoup(html, "html.parser")
    result: dict = {}

    face = _num(_row_value(soup, "액면가"))
    if face:
        result["face_value"] = int(face)

    shares_text = _row_value(soup, "발행주식수/유동비율")
    if shares_text and "/" in shares_text:
        shares_part, ratio_part = shares_text.split("/", 1)
        shares = _num(shares_part)
        ratio = _num(ratio_part)
        if shares:
            result["shares_outstanding"] = int(shares)
            if ratio:
                result["float_shares"] = int(shares * ratio / 100)

    # 같은 문장이 중복으로 내려오는 경우가 있어 순서를 유지하며 중복 제거
    lines: list[str] = []
    for li in soup.select("div.cmp_comment li"):
        text = li.get_text(" ", strip=True)
        if text and text not in lines:
            lines.append(text)
    if lines:
        result["description"] = " ".join(lines)

    # 펀더멘털 표의 첫 번째 값 = 최근 결산 실적(A), 두 번째 = 컨센서스(E)
    th = soup.find("th", string=lambda s: s and s.strip() == "EV/EBITDA")
    td = th.find_next_sibling("td") if th else None
    ev = fit_numeric(_num(td.get_text(strip=True)) if td else None, 6)  # numeric(8,2)
    if ev is not None:
        result["ev_ebitda"] = round(ev, 2)

    return result


def parse_overview(html: str) -> dict:
    """c1020001: '(상장일: 2017/09/14)'."""
    m = re.search(r"상장일:\s*(\d{4})/(\d{2})/(\d{2})", html)
    return {"listing_date": f"{m.group(1)}-{m.group(2)}-{m.group(3)}"} if m else {}


def fetch_one(code: str) -> tuple[str, dict]:
    result: dict = {}
    for page, parser in (("c1010001", parse_main), ("c1020001", parse_overview)):
        try:
            res = requests.get(
                f"{BASE_URL}/{page}.aspx",
                params={"cmp_cd": code},
                headers=HEADERS,
                timeout=10,
            )
            if res.ok:
                result.update(parser(res.text))
        except requests.RequestException:
            pass
    return code, result


# ──────────────────────────────────────────────────────────────
# DB 업데이트
# ──────────────────────────────────────────────────────────────

_STOCK_FIELDS = ("face_value", "float_shares", "description", "listing_date", "shares_outstanding")


def _latest_quarters() -> dict[str, tuple[int, int]]:
    latest: dict[str, tuple[int, int]] = {}
    for row in fetch_all(supabase, "financials", "stock_code, year, quarter"):
        yq = (row["year"], row["quarter"])
        if row["stock_code"] not in latest or yq > latest[row["stock_code"]]:
            latest[row["stock_code"]] = yq
    return latest


def main() -> None:
    print("=== WiseReport 기업 개요 보강 시작 ===")
    keys = fetch_stock_keys(supabase)
    codes = sorted(keys)
    print(f"대상 종목 {len(codes)}개")

    data: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        futures = [pool.submit(fetch_one, code) for code in codes]
        for i, future in enumerate(as_completed(futures), 1):
            code, result = future.result()
            if result:
                data[code] = result
            if i % 200 == 0:
                print(f"  [{i}/{len(codes)}]")
    print(f"수집 완료: {len(data)}개 종목")

    stock_rows = []
    for code, d in data.items():
        row = {"code": code, **keys[code], **{f: d[f] for f in _STOCK_FIELDS if d.get(f) is not None}}
        if len(row) > 3:
            stock_rows.append(row)
    if stock_rows:
        chunked_upsert(supabase, "stocks", stock_rows, on_conflict="code")
    print(f"[stocks] {len(stock_rows)}개 종목 업데이트")

    latest = _latest_quarters()
    fin_rows = [
        {"stock_code": code, "year": latest[code][0], "quarter": latest[code][1], "ev_ebitda": d["ev_ebitda"]}
        for code, d in data.items()
        if d.get("ev_ebitda") is not None and code in latest
    ]
    if fin_rows:
        chunked_upsert(supabase, "financials", fin_rows, on_conflict="stock_code,year,quarter")
    print(f"[financials] {len(fin_rows)}개 행 ev_ebitda 업데이트")

    print("\n완료!")


if __name__ == "__main__":
    main()
