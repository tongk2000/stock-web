"""
상장사 일봉 수집 (FinanceDataReader → Supabase)
- 증분 업데이트: DB의 마지막 날짜 이후만 수집
- KRX / NXT 별도 저장
"""

import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import FinanceDataReader as fdr
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)


def get_last_business_day():
    """가장 최근 영업일"""
    d = datetime.now()
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def get_from_date(exchange: str):
    """거래소별 마지막 저장 날짜 다음날 반환. 없으면 1년 전."""
    res = (
        supabase.table("candles")
        .select("date")
        .eq("exchange", exchange)
        .eq("candle_type", "daily")
        .order("date", desc=True)
        .limit(1)
        .execute()
    )
    if res.data:
        last_date = datetime.strptime(res.data[0]["date"], "%Y-%m-%d")
        return (last_date + timedelta(days=1)).strftime("%Y-%m-%d")
    return (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")


def get_listed_stocks(market_key: str):
    """상장사 목록 반환. market_key: KOSPI / KOSDAQ / NXT"""
    df = fdr.StockListing(market_key)
    stocks = []
    for _, row in df.iterrows():
        code = str(row["Code"]).zfill(6)
        name = row.get("Name") or row.get("ISU_NM") or row.get("ShortName") or code
        stocks.append({"code": code, "name": str(name)})
    return stocks


def upsert_stocks(stocks: list, market: str):
    """종목 목록 upsert"""
    rows = [{"code": s["code"], "name": s["name"], "market": market} for s in stocks]
    for i in range(0, len(rows), 500):
        supabase.table("stocks").upsert(rows[i:i+500], on_conflict="code").execute()


def collect_candles(code: str, exchange: str, from_date: str, to_date: str):
    """일봉 수집 후 Supabase 저장"""
    try:
        source = f"{code}:NXT" if exchange == "NXT" else code
        df = fdr.DataReader(source, from_date, to_date)
        if df.empty:
            return 0

        rows = []
        for date, row in df.iterrows():
            rows.append({
                "stock_code": code,
                "exchange": exchange,
                "candle_type": "daily",
                "date": date.strftime("%Y-%m-%d"),
                "open": int(row["Open"]),
                "high": int(row["High"]),
                "low": int(row["Low"]),
                "close": int(row["Close"]),
                "volume": int(row["Volume"]),
            })

        if rows:
            supabase.table("candles").upsert(
                rows, on_conflict="stock_code,exchange,candle_type,date"
            ).execute()

        return len(rows)
    except Exception as e:
        print(f"  [{code}:{exchange}] 오류: {e}")
        return 0


def run(exchange: str, markets: list[str]):
    """거래소별 수집 실행"""
    to_date = get_last_business_day()
    from_date = get_from_date(exchange)

    if from_date > to_date:
        print(f"[{exchange}] 이미 최신 상태입니다.")
        return

    print(f"[{exchange}] 수집 기간: {from_date} ~ {to_date}")

    stocks = []
    for market in markets:
        try:
            s = get_listed_stocks(market)
            upsert_stocks(s, market)
            stocks.extend(s)
            print(f"  {market}: {len(s)}개")
        except Exception as e:
            print(f"  {market} 목록 오류: {e}")

    total = len(stocks)
    for i, s in enumerate(stocks, 1):
        code = s["code"]
        name = s["name"]
        count = collect_candles(code, exchange, from_date, to_date)
        print(f"  [{i}/{total}] {name}({code}): {count}개")

    print(f"[{exchange}] 완료!")


def main():
    run(exchange="KRX", markets=["KOSPI", "KOSDAQ"])
    run(exchange="NXT", markets=["KOSPI", "KOSDAQ"])  # NXT도 동일 종목코드 사용


if __name__ == "__main__":
    main()
