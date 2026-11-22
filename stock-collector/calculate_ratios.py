"""
재무비율 계산 스크립트 (candles + financials + stocks → financials 업데이트)

collect_candles.py 실행 직후 최신 종가를 기준으로 아래 지표를 계산하여
financials 테이블 종목별 최신 분기 행에 upsert합니다.

  EPS          = 당기순이익(최근 4분기, TTM) / 상장주식수
  BPS          = 자본총계   / 상장주식수
  market_cap   = 종가 × 상장주식수
  PER          = 시가총액   / 당기순이익(TTM)
  PBR          = 시가총액   / 자본총계
  ROE          = 당기순이익(TTM) / 자본총계 × 100
  debt_ratio   = (자산총계 - 자본총계) / 자본총계 × 100
  dividend_yield = 배당금(DPS) / 종가 × 100

환경 변수:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

from _utils import chunked_upsert, fetch_all, fit_numeric, get_last_business_day, get_supabase

supabase = get_supabase()


def _round2(val: float | None) -> float | None:
    return round(val, 2) if val is not None else None


def fetch_prices(date_str: str) -> dict[str, int]:
    """해당 날짜의 KRX 일봉 종가. {stock_code: close}"""
    rows = fetch_all(
        supabase, "candles", "stock_code, close",
        exchange="KRX", candle_type="daily", date=date_str,
    )
    return {row["stock_code"]: row["close"] for row in rows}


def fetch_latest_financials() -> dict[str, dict]:
    """종목별 최신 (year, quarter) 재무 데이터. {stock_code: row}"""
    latest: dict[str, dict] = {}
    for row in fetch_all(
        supabase, "financials", "stock_code, year, quarter, net_income, net_income_ttm, equity, total_assets, dividend"
    ):
        code = row["stock_code"]
        yq = (row["year"], row["quarter"])
        if code not in latest or yq > (latest[code]["year"], latest[code]["quarter"]):
            latest[code] = row
    return latest


def fetch_shares() -> dict[str, int]:
    """stocks 테이블에서 상장주식수. {code: shares_outstanding}"""
    return {
        row["code"]: row["shares_outstanding"]
        for row in fetch_all(supabase, "stocks", "code, shares_outstanding")
        if row["shares_outstanding"]
    }


def calculate(
    close: int | None,
    shares: int | None,
    net_income: int | None,
    equity: int | None,
    total_assets: int | None,
    dividend: int | None,
) -> dict:
    """각 지표 계산. 분모가 0 이하거나 데이터 없으면 None."""
    market_cap = (close * shares) if close and shares else None

    eps = (net_income // shares) if net_income is not None and shares else None
    bps = (equity // shares) if equity is not None and equity > 0 and shares else None

    per = _round2(market_cap / net_income) if market_cap and net_income else None
    pbr = _round2(market_cap / equity) if market_cap and equity and equity > 0 else None

    roe = _round2(net_income / equity * 100) if net_income is not None and equity and equity > 0 else None

    debt_ratio = None
    if total_assets is not None and equity and equity > 0:
        debt_ratio = _round2((total_assets - equity) / equity * 100)

    # 무배당(0)도 0% 로 저장해 '모름'과 구분한다
    dividend_yield = _round2(dividend / close * 100) if dividend is not None and close else None

    return {
        "market_cap": market_cap,
        "eps": eps,
        "bps": bps,
        # 컬럼 정밀도: per·debt_ratio numeric(8,2), pbr·roe·dividend_yield numeric(6,2)
        "per": fit_numeric(per, 6),
        "pbr": fit_numeric(pbr, 4),
        "roe": fit_numeric(roe, 4),
        "debt_ratio": fit_numeric(debt_ratio, 6),
        "dividend_yield": fit_numeric(dividend_yield, 4),
    }


def main() -> None:
    print("=== 재무비율 계산 시작 ===")
    date = get_last_business_day()
    date_str = date.strftime("%Y-%m-%d")
    print(f"기준일: {date_str}")

    print("종가 조회...")
    prices = fetch_prices(date_str)
    print(f"  {len(prices)}개 종목")

    print("재무 데이터 조회...")
    financials = fetch_latest_financials()
    print(f"  {len(financials)}개 종목")

    print("상장주식수 조회...")
    shares_map = fetch_shares()
    print(f"  {len(shares_map)}개 종목")

    rows = []
    skipped = 0
    for code, fin in financials.items():
        ratios = calculate(
            close=prices.get(code),
            shares=shares_map.get(code),
            # 분기 행의 net_income 은 3개월치라 PER·EPS·ROE 에는 최근 4분기 합(TTM)을 쓴다.
            # TTM 이 없으면(전년 사업보고서 누락 등) Q4(연간) 행일 때만 그 값을 쓴다
            net_income=fin.get("net_income_ttm")
            if fin.get("net_income_ttm") is not None
            else (fin.get("net_income") if fin["quarter"] == 4 else None),
            equity=fin.get("equity"),
            total_assets=fin.get("total_assets"),
            dividend=fin.get("dividend"),
        )
        # 최소한 market_cap이라도 계산된 경우에만 upsert
        if all(v is None for v in ratios.values()):
            skipped += 1
            continue

        rows.append({
            "stock_code": code,
            "year": fin["year"],
            "quarter": fin["quarter"],
            **ratios,
        })

    if rows:
        chunked_upsert(supabase, "financials", rows, on_conflict="stock_code,year,quarter")
        print(f"완료: {len(rows)}개 upsert (건너뜀: {skipped}개)")
    else:
        print("업데이트할 데이터 없음")


if __name__ == "__main__":
    main()
