"""TAM(스마트폰 SET 시장 전망) 예측치를 담는 SQLite 저장소.

스키마
------
forecast: (source, vintage, vendor, year) 단위의 예측치 원본 테이블.
  - source: 예측 출처/기관 ('S.LSI', '관계사 A', 'Omdia' 등). 기관별 파서가 아직 없는
    상태에서는 CLI 기본값 'S.LSI' 그대로 사용한다.
  - vintage: 예측이 발표된 시점, 'YYYY-MM' 형식 문자열 (예: '2026-06')
  - value: NULL 허용 (원본 소스가 비어 있으면 NULL, 0으로 임의 치환하지 않음)

뷰
----
v_yoy: 같은 (source, vintage) 안에서 전년 대비(YoY) 계산 (year >= 2026 대상).
v_revision: 같은 (source, vendor, year)를 vintage 오름차순으로 봤을 때 직전 vintage 대비
  리비전. 출처가 다르면 서로의 리비전 계산에 영향을 주지 않는다.
v_latest: 출처별 가장 최신 vintage(문자열 비교상 최대값)의 전체 행 -- 전역 최신이 아니라
  출처마다 각자의 최신 vintage 행이 나온다 (예: S.LSI가 7월까지, Omdia가 6월까지만
  있어도 Omdia의 6월 행은 그대로 나온다).

마이그레이션
------------
Task 2 스키마는 source 컬럼이 없고 PK가 (vintage, vendor, year)였다. init_db()는 매번
forecast 테이블에 source 컬럼이 있는지 확인하고, 없으면(레거시 스키마) 새 스키마
테이블로 데이터를 옮기면서 기존 행을 전부 source='S.LSI'로 귀속시킨다. 이미 새
스키마인 DB에서는 아무 일도 하지 않는다 (멱등). 뷰는 정의가 바뀔 수 있으므로 매번
DROP 후 재생성한다.

이 모듈은 stdlib sqlite3만 사용한다.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

# 기존(Task 2, source 컬럼 없는) 데이터를 마이그레이션할 때 귀속시킬 기본 출처.
LEGACY_DEFAULT_SOURCE = "S.LSI"

_FORECAST_TABLE_BODY = """(
  source  TEXT NOT NULL,
  vintage TEXT NOT NULL,
  vendor  TEXT NOT NULL,
  year    INTEGER NOT NULL,
  value   REAL,
  source_file TEXT,
  loaded_at TEXT,
  PRIMARY KEY (source, vintage, vendor, year)
)"""

SCHEMA_SQL = f"CREATE TABLE IF NOT EXISTS forecast{_FORECAST_TABLE_BODY};"

# 뷰는 정의 갱신이 기존 DB에도 반영되도록 init_db가 호출될 때마다 DROP 후 재생성한다.
DROP_VIEWS_SQL = """
DROP VIEW IF EXISTS v_yoy;
DROP VIEW IF EXISTS v_revision;
DROP VIEW IF EXISTS v_latest;
"""

# NULL-safe 나눗셈: prev 값이 NULL이거나 0이면 비율은 NULL로 둔다.
# (SQLite는 REAL 0으로 나누면 NULL이 아니라 inf/NaN을 반환하므로 CASE로 직접 막아야 한다.)
VIEW_YOY_SQL = """
CREATE VIEW v_yoy AS
SELECT
  f.source AS source,
  f.vintage AS vintage,
  f.vendor AS vendor,
  f.year AS year,
  f.value AS value,
  p.value AS prev_value,
  CASE
    WHEN p.value IS NULL OR p.value = 0 THEN NULL
    ELSE f.value / p.value - 1
  END AS yoy
FROM forecast f
LEFT JOIN forecast p
  ON p.source = f.source AND p.vintage = f.vintage AND p.vendor = f.vendor AND p.year = f.year - 1
WHERE f.year >= 2026;
"""

VIEW_REVISION_SQL = """
CREATE VIEW v_revision AS
WITH ordered AS (
  SELECT
    source,
    vintage,
    vendor,
    year,
    value,
    LAG(value) OVER (PARTITION BY source, vendor, year ORDER BY vintage ASC) AS prev_value
  FROM forecast
)
SELECT
  source,
  vintage,
  vendor,
  year,
  value,
  prev_value,
  value - prev_value AS delta,
  CASE
    WHEN prev_value IS NULL OR prev_value = 0 THEN NULL
    ELSE value / prev_value - 1
  END AS delta_pct
FROM ordered;
"""

# 상관 서브쿼리로 출처(source)별 최신 vintage를 각자 계산한다 (전역 MAX가 아님).
VIEW_LATEST_SQL = """
CREATE VIEW v_latest AS
SELECT f.*
FROM forecast f
WHERE f.vintage = (
  SELECT MAX(f2.vintage) FROM forecast f2 WHERE f2.source = f.source
);
"""


def _migrate_legacy_schema(conn: sqlite3.Connection) -> None:
    """레거시(source 컬럼 없는) forecast 테이블을 새 스키마로 옮긴다.

    - forecast 테이블이 아직 없으면(신규 DB) 아무 일도 하지 않는다 -- 뒤이어 실행되는
      SCHEMA_SQL(CREATE TABLE IF NOT EXISTS)이 새 스키마로 바로 만든다.
    - 이미 source 컬럼이 있으면(마이그레이션 완료 상태) 아무 일도 하지 않는다 (멱등).
    """
    existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(forecast)").fetchall()}
    if not existing_columns:
        return  # forecast table doesn't exist yet -- nothing to migrate
    if "source" in existing_columns:
        return  # already on the new schema

    conn.execute("DROP TABLE IF EXISTS forecast_new")
    conn.execute(f"CREATE TABLE forecast_new{_FORECAST_TABLE_BODY}")
    conn.execute(
        "INSERT INTO forecast_new (source, vintage, vendor, year, value, source_file, loaded_at) "
        "SELECT ?, vintage, vendor, year, value, source_file, loaded_at FROM forecast",
        (LEGACY_DEFAULT_SOURCE,),
    )
    conn.execute("DROP TABLE forecast")
    conn.execute("ALTER TABLE forecast_new RENAME TO forecast")
    conn.commit()


def init_db(path) -> sqlite3.Connection:
    """path의 SQLite 파일에 연결하고, 스키마/뷰를 최신 상태로 맞춘다.

    - forecast 테이블이 레거시 스키마면 마이그레이션한다 (기존 행은 source='S.LSI'로).
    - forecast 테이블이 아예 없으면 새 스키마로 생성한다.
    - 뷰(v_yoy/v_revision/v_latest)는 매번 DROP 후 재생성한다 (정의 갱신 반영).
    반복 호출은 멱등하다: 이미 새 스키마인 DB에서는 마이그레이션/테이블 재생성 없이
    뷰만 다시 만든다.

    뷰는 테이블 마이그레이션보다 먼저 DROP한다 -- 레거시 뷰(v_latest 등)가 forecast
    테이블을 참조한 채로 남아 있으면, 마이그레이션 중 DROP TABLE forecast 직후
    ALTER TABLE ... RENAME TO forecast 시점에 SQLite가 "no such table: forecast"로
    실패한다 (해당 순간 forecast_new가 아직 forecast로 이름 붙기 전이라 뷰가 가리키는
    테이블이 일시적으로 존재하지 않기 때문).
    """
    conn = sqlite3.connect(Path(path))
    conn.executescript(DROP_VIEWS_SQL)
    _migrate_legacy_schema(conn)
    conn.executescript(SCHEMA_SQL)
    conn.executescript(VIEW_YOY_SQL)
    conn.executescript(VIEW_REVISION_SQL)
    conn.executescript(VIEW_LATEST_SQL)
    conn.commit()
    return conn


def upsert_vintage(conn: sqlite3.Connection, source: str, vintage: str, rows, source_file: str) -> None:
    """해당 (source, vintage)의 기존 행을 삭제하고 rows로 다시 채운다.

    같은 (source, vintage) 재적재는 멱등 -- 다른 source로 같은 vintage를 적재해도
    서로의 행을 건드리지 않는다.

    rows: (vendor, year, value) 튜플의 리스트. value는 None일 수 있다 (그대로 NULL 저장).
    DELETE와 INSERT를 한 트랜잭션으로 묶어 커밋하므로, 재적재 중간 상태가 남지 않는다.
    """
    loaded_at = datetime.now(timezone.utc).isoformat()
    conn.execute("DELETE FROM forecast WHERE source = ? AND vintage = ?", (source, vintage))
    conn.executemany(
        "INSERT INTO forecast (source, vintage, vendor, year, value, source_file, loaded_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [(source, vintage, vendor, year, value, source_file, loaded_at) for vendor, year, value in rows],
    )
    conn.commit()
