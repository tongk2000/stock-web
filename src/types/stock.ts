/**
 * 종목 관련 타입 정의
 *
 * Supabase stocks / candles 테이블과 1:1 대응합니다.
 */

/** stocks 테이블 — 상장 종목 정보 */
export type Stock = {
  code: string;            // 종목코드 (e.g. "005930")
  name: string;            // 종목명 (e.g. "삼성전자")
  market: "KOSPI" | "KOSDAQ";
  current_price?: number;  // 현재가 (폴링 시 사용, 미구현)
  change_rate?: number;    // 등락률 (%, 미구현)
};

/** candles 테이블 — OHLCV 캔들 데이터 (일봉 기준) */
export type Candle = {
  date: string;   // YYYY-MM-DD
  open: number;   // 시가
  high: number;   // 고가
  low: number;    // 저가
  close: number;  // 종가
  volume: number; // 거래량
};

/** 캔들 집계 단위 */
export type CandleType = "daily" | "weekly" | "monthly";
