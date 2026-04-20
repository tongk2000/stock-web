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


def chunked_upsert(
    supabase: Client,
    table: str,
    rows: list[dict],
    on_conflict: str,
    chunk: int = 500,
) -> None:
    """rows 를 chunk 단위로 나누어 upsert."""
    for i in range(0, len(rows), chunk):
        supabase.table(table).upsert(rows[i:i + chunk], on_conflict=on_conflict).execute()
