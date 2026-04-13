export type Stock = {
  code: string;       // 종목코드 (e.g. "005930")
  name: string;       // 종목명 (e.g. "삼성전자")
  market: "KOSPI" | "KOSDAQ";
  current_price?: number;
  change_rate?: number;  // 등락률 (%)
};

export type Candle = {
  date: string;       // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type CandleType = "daily" | "weekly" | "monthly";
