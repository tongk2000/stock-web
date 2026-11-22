"""수집 스크립트 공용 유틸.

Supabase 클라이언트 팩토리, 영업일 계산, 청크 upsert 등
`collect_*.py` 가 반복해서 쓰는 헬퍼를 모아둔 모듈.
"""

import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
from supabase import Client, create_client


def get_supabase() -> Client:
    """환경 변수에서 Supabase service_role 클라이언트 생성."""
    load_dotenv()
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def get_last_business_day(ref: datetime | None = None) -> datetime:
    """ref(기본 오늘) 이하의 가장 최근 영업일(월~금)."""
    d = ref or datetime.now()
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


def prev_business_day(d: datetime, n: int = 1) -> datetime:
    """d 기준 n 영업일 이전 (d 자신이 영업일이면 제외하고 n번 뒤로)."""
    result = d
    shifted = 0
    while shifted < n:
        result -= timedelta(days=1)
        if result.weekday() < 5:
            shifted += 1
    return result


def recent_business_days(count: int, ref: datetime | None = None) -> list[datetime]:
    """ref 이하 최근 영업일 count 개 (내림차순)."""
    days: list[datetime] = []
    d = get_last_business_day(ref)
    while len(days) < count:
        days.append(d)
        d = prev_business_day(d)
    return days


def fetch_all(supabase: Client, table: str, columns: str, page: int = 1000, **eq) -> list[dict]:
    """PostgREST max_rows(1000) 제한을 넘도록 range 페이지네이션으로 전체 행 조회."""
    rows: list[dict] = []
    start = 0
    while True:
        query = supabase.table(table).select(columns)
        for col, val in eq.items():
            query = query.eq(col, val)
        batch = query.range(start, start + page - 1).execute().data or []
        rows.extend(batch)
        if len(batch) < page:
            return rows
        start += page


def fetch_stock_codes(supabase: Client) -> set[str]:
    """stocks 테이블에 등록된 종목코드. FK/NOT NULL 위반 방지용 필터."""
    return {row["code"] for row in fetch_all(supabase, "stocks", "code")}


def fetch_stock_keys(supabase: Client) -> dict[str, dict]:
    """{code: {"name", "market"}}. stocks upsert 는 INSERT 단계에서 NOT NULL(name, market)을
    먼저 검사하므로 기존 종목을 갱신할 때도 이 두 값을 함께 보내야 한다."""
    return {
        row["code"]: {"name": row["name"], "market": row["market"]}
        for row in fetch_all(supabase, "stocks", "code, name, market")
    }


def fit_numeric(val: float | None, int_digits: int) -> float | None:
    """numeric(p, s) 컬럼 범위(정수부 int_digits 자리)를 넘는 값은 None.

    매출·자본이 아주 작은 종목은 비율이 수만 % 로 튀어 numeric field overflow 로
    upsert 전체가 실패하므로, 의미 없는 극단값은 저장하지 않는다.
    """
    if val is None or abs(val) >= 10 ** int_digits:
        return None
    return val


def chunked_upsert(
    supabase: Client,
    table: str,
    rows: list[dict],
    on_conflict: str,
    chunk: int = 500,
) -> None:
    """rows 를 chunk 단위로 나누어 upsert.

    PostgREST 일괄 upsert 는 요청 내 키 합집합을 컬럼으로 쓰므로, 어떤 행에 빠진 키는
    NULL 로 덮어쓴다. 키 조합이 같은 행끼리 묶어 보내 기존 값을 보존한다.
    """
    groups: dict[tuple[str, ...], list[dict]] = {}
    for row in rows:
        groups.setdefault(tuple(sorted(row)), []).append(row)
    for group in groups.values():
        for i in range(0, len(group), chunk):
            supabase.table(table).upsert(group[i:i + chunk], on_conflict=on_conflict).execute()
