"""
상장사 일봉 수집 스크립트 (FinanceDataReader → Supabase)

GitHub Actions 스케줄(평일 16:00 KST)로 실행되며,
KOSPI·KOSDAQ 전 종목의 일봉 데이터를 증분 수집합니다.

흐름:
  1. 거래소(KRX/NXT)별 마지막 저장 날짜 조회
  2. 상장사 목록 가져와 stocks 테이블 upsert
  3. 각 종목의 미수집 기간 일봉을 FinanceDataReader로 병렬 조회
  4. rows를 버퍼에 모아 배치 단위로 candles 테이블에 upsert

환경 변수:
  - SUPABASE_URL             : Supabase 프로젝트 URL
  - SUPABASE_SERVICE_ROLE_KEY : service_role 키 (RLS 우회)
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

import FinanceDataReader as fdr

from _utils import chunked_upsert, get_last_business_day, get_supabase

supabase = get_supabase()

# GitHub Actions 러너(미국 리전)에서 KRX/네이버까지 왕복 지연이 크기 때문에
# fetch만 스레드로 병렬화한다. DB 쓰기는 배치로 모아 처리.
FETCH_WORKERS = 12
UPSERT_BATCH = 1000


def last_business_day_str():
    """가장 최근 영업일 (YYYY-MM-DD)"""
    return get_last_business_day().strftime("%Y-%m-%d")


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
    chunked_upsert(supabase, "stocks", rows, on_conflict="code")


def fetch_candles(code: str, exchange: str, from_date: str, to_date: str) -> list[dict]:
    """단일 종목 일봉 fetch (DB 쓰기 없음). 실패 시 빈 리스트."""
    try:
        source = f"{code}:NXT" if exchange == "NXT" else code
        df = fdr.DataReader(source, from_date, to_date)
        if df.empty:
            return []

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
        return rows
    except Exception as e:
        print(f"  [{code}:{exchange}] 오류: {e}")
        return []


def flush_candles(rows: list[dict]) -> None:
    """candles 배치 upsert."""
    if not rows:
        return
    chunked_upsert(
        supabase,
        "candles",
        rows,
        on_conflict="stock_code,exchange,candle_type,date",
        chunk=UPSERT_BATCH,
    )


def run(exchange: str, markets: list[str]):
    """거래소별 수집 실행"""
    to_date = last_business_day_str()
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
    buffer: list[dict] = []
    total_rows = 0

    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        futures = {
            pool.submit(fetch_candles, s["code"], exchange, from_date, to_date): s
            for s in stocks
        }

        # as_completed 루프는 메인 스레드 단독이므로 버퍼에 락 불필요.
        for done, fut in enumerate(as_completed(futures), 1):
            s = futures[fut]
            rows = fut.result()
            if rows:
                buffer.extend(rows)
                total_rows += len(rows)
            if len(buffer) >= UPSERT_BATCH:
                flush_candles(buffer)
                buffer = []
            print(f"  [{done}/{total}] {s['name']}({s['code']}): {len(rows)}개")

    flush_candles(buffer)
    print(f"[{exchange}] 완료! 총 {total_rows}행 upsert")


def main():
    run(exchange="KRX", markets=["KOSPI", "KOSDAQ"])
    run(exchange="NXT", markets=["KOSPI", "KOSDAQ"])  # NXT도 동일 종목코드 사용


if __name__ == "__main__":
    main()
