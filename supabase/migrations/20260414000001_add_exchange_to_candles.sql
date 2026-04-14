-- candles 테이블에 거래소 컬럼 추가 (KRX / NXT)
alter table public.candles add column exchange text not null default 'KRX'
  check (exchange in ('KRX', 'NXT'));

-- 기존 unique 제약 교체 (exchange 포함)
alter table public.candles drop constraint candles_stock_code_candle_type_date_key;
alter table public.candles add constraint candles_stock_code_exchange_candle_type_date_key
  unique (stock_code, exchange, candle_type, date);

-- 인덱스 교체
drop index idx_candles_stock_type_date;
create index idx_candles_stock_exchange_type_date
  on public.candles (stock_code, exchange, candle_type, date desc);
