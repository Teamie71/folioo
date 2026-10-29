"""테스트 공용 fixture

경험정리 DB fixture 는 `tests/test_features` 와 `tests/test_app` 양쪽에서 쓰므로
루트 conftest 에 둔다.

**실제 PostgreSQL에 붙어서 돌립니다.** 동시성(세션당 running 1건)과 lease 만료는
asyncpg를 mock으로 감싸면 아무것도 검증하지 못합니다.

DB 주소는 `EXPMAP_TEST_DATABASE_URL`로 명시해야 합니다. 미설정 시 테스트 시작
전에 실패하며 개발용 `DATABASE_URL`로 대체하지 않습니다.
테스트는 DB 스키마를 적용하고, 테스트 전후에 관련 테이블에서
사용자 ID(`user_id`)가 900만 이상인 행을 삭제합니다.
반드시 개발·운영 DB와 분리한 테스트 전용 DB를 지정해야 합니다.

연결 실패는 기본적으로 skip 하지만 `EXPMAP_REQUIRE_DB` 가 켜져 있으면
실패합니다. CI 와 루트 `ai:test` 명령은 이 값을 켜고 돌립니다.

풀은 테스트마다 새로 엽니다. pytest-asyncio의 이벤트 루프가 테스트 단위라
session 스코프 풀을 공유하면 커넥션이 다른 루프에 묶입니다.
"""

import os
import pathlib
from typing import NoReturn

import asyncpg
import pytest
import pytest_asyncio

from features.experience_map.map_context import ExperienceMapSnapshot, build_map_snapshot

try:
    from dotenv import load_dotenv

    # 명시한 테스트 DB 주소 등 로컬 환경변수를 읽는다.
    load_dotenv()
except ImportError:
    pass

SCHEMA_SQL = pathlib.Path(__file__).resolve().parents[1] / "scripts/experience_map/schema.sql"

# 테스트 데이터 정리 기준: 사용자 ID 900만 이상
TEST_USER_ID_BASE = 9_000_000

REQUIRED_TABLES = ("ai_experience_session", "ai_experience_request")

# 켜져 있으면 DB 를 못 쓸 때 skip 대신 실패한다.
REQUIRE_DB_ENV = "EXPMAP_REQUIRE_DB"


def _db_unavailable(reason: str) -> NoReturn:
    """DB 를 못 쓸 때의 처리. 기본은 skip, `EXPMAP_REQUIRE_DB` 면 실패.

    **skip 은 초록불로 보입니다.** 세션당 running 1건·lease 만료·재시도 원자성
    테스트가 전부 이 fixture 에 걸려 있어서, DB 없이 돌리면 60여 개를 건너뛴 채
    "통과" 로 끝납니다. 정작 검증이 필요한 동시성 부분만 빠지는 셈입니다.

    그래서 CI 는 이 값을 켜고 돌립니다. DB 가 안 붙거나 스키마가 안 맞으면
    조용히 넘어가지 않고 빨간불이 됩니다.
    """
    if os.getenv(REQUIRE_DB_ENV, "").strip():
        pytest.fail(
            f"{REQUIRE_DB_ENV} 가 켜져 있는데 DB 테스트를 돌릴 수 없습니다: {reason}",
            pytrace=False,
        )
    pytest.skip(reason)


# 스키마 준비는 한 번만 확인한다.
_schema_state: str | None = None


def _database_url() -> str:
    """공백을 제거한 테스트 전용 DB 주소를 반환한다.

    EXPMAP_TEST_DATABASE_URL이 없거나 공백뿐이면 pytest.UsageError를 발생시킨다.
    개발용 DATABASE_URL로 대체하지 않는다.
    """
    url = os.getenv("EXPMAP_TEST_DATABASE_URL", "").strip()
    if not url:
        raise pytest.UsageError(
            "EXPMAP_TEST_DATABASE_URL이 필요합니다. "
            "개발·운영 DB와 분리한 테스트 전용 DB 주소를 지정하세요. "
            "DATABASE_URL은 테스트에 사용하지 않습니다."
        )
    return url


def pytest_sessionstart(session: pytest.Session) -> None:
    """DB에 접근하기 전에 테스트 전용 주소를 확인한다."""
    _database_url()


async def _ensure_schema(pool: asyncpg.Pool) -> str | None:
    """스키마를 준비한다. 못 쓰면 skip 사유 문자열을 돌려준다."""
    global _schema_state
    if _schema_state is not None:
        return None if _schema_state == "ok" else _schema_state

    # 스키마 파일이 있으면 적용한다 (멱등). 운영 DB 에는 메인 서버 migration 이
    # 이미 만들어 두므로 파일이 없어도 테이블만 있으면 된다.
    if SCHEMA_SQL.exists():
        try:
            async with pool.acquire() as conn:
                await conn.execute(SCHEMA_SQL.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 - 사유는 skip 메시지로 충분하다
            _schema_state = f"스키마를 적용하지 못했습니다: {exc}"
            return _schema_state

    rows = await pool.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)",
        list(REQUIRED_TABLES),
    )
    missing = sorted(set(REQUIRED_TABLES) - {row["tablename"] for row in rows})
    if missing:
        _schema_state = (
            f"경험정리 테이블이 없습니다: {', '.join(missing)}. "
            "docs/architecture/experience-map-local-dev.md 를 참고해 스키마를 만드세요."
        )
        return _schema_state

    _schema_state = "ok"
    return None


@pytest_asyncio.fixture
async def db_pool():
    """테스트용 DB 커넥션 풀을 제공하고 사용 후 닫는다.

    DB 연결 또는 스키마 준비 실패 시 기본적으로 skip한다.
    EXPMAP_REQUIRE_DB가 활성화되어 있으면 실패 처리한다.
    """
    url = _database_url()
    try:
        pool = await asyncpg.create_pool(url, min_size=1, max_size=5, timeout=3)
    except Exception as exc:  # noqa: BLE001 - 접속 실패 사유는 메시지로 충분하다
        _db_unavailable(f"경험 맵 DB에 접속할 수 없습니다: {exc}")

    try:
        reason = await _ensure_schema(pool)
        if reason:
            _db_unavailable(reason)
        yield pool
    finally:
        await pool.close()


@pytest_asyncio.fixture
async def clean_db(db_pool):
    """테스트 대역 데이터를 앞뒤로 지운다."""

    async def _wipe() -> None:
        # ai_experience_message → ai_experience_request → ai_experience_session
        # 순서를 지킨다. 둘 다 session 을 FK 로 참조하는데 CASCADE 를 안 걸었으므로
        # (ai_experience_request 와 같은 관례), session 을 먼저 지우면 위반이 난다.
        await db_pool.execute("DELETE FROM ai_kakao_turn WHERE user_id >= $1", TEST_USER_ID_BASE)
        await db_pool.execute(
            "DELETE FROM ai_experience_message WHERE user_id >= $1", TEST_USER_ID_BASE
        )
        await db_pool.execute(
            "DELETE FROM ai_experience_request WHERE user_id >= $1", TEST_USER_ID_BASE
        )
        await db_pool.execute(
            "DELETE FROM ai_experience_session WHERE user_id >= $1", TEST_USER_ID_BASE
        )

    await _wipe()
    yield db_pool
    await _wipe()


@pytest.fixture
def user_id(request) -> str:
    """테스트마다 다른 user_id. 서로 침범하지 않는다."""
    return str(TEST_USER_ID_BASE + (abs(hash(request.node.nodeid)) % 500_000))


@pytest.fixture
def repository_snapshot():
    """메인 서버 소유 block DDL 없이 쓸 수 있는 읽기 전용 맵 snapshot fixture."""

    async def _get_map_snapshot(_repository, _user_id: str) -> ExperienceMapSnapshot:
        return build_map_snapshot([], map_version=1)

    return _get_map_snapshot
