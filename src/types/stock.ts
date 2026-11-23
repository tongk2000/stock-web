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

/** short_sales 테이블 — 일별 공매도 체결(KRX 정규장 기준). numeric 열은 PostgREST가 문자열로 줄 수 있어 읽을 때 Number로 바꾼다 */
export type ShortSale = {
  date: string;                       // YYYY-MM-DD
  short_volume: number | null;        // 공매도 체결 수량(주)
  short_value: number | null;         // 공매도 거래대금(원)
  short_volume_ratio: number | null;  // 거래량 대비 공매도 비중(%)
  short_value_ratio: number | null;   // 거래대금 대비 공매도 비중(%)
};

/** credit_balances 테이블 — 일별 신용잔고(date는 매매일, 결제일 기준 공시라 최근 2영업일은 없다) */
export type CreditBalance = {
  date: string;                        // YYYY-MM-DD
  loan_balance_shares: number | null;  // 융자 잔고 수량(주)
  loan_balance_amount: number | null;  // 융자 잔고 금액(원)
  loan_balance_rate: number | null;    // 신용잔고율(상장주식수 대비 %)
  loan_new_shares: number | null;      // 융자 신규 수량
  loan_repay_shares: number | null;    // 융자 상환 수량
  lend_balance_shares: number | null;  // 대주 잔고 수량
};
