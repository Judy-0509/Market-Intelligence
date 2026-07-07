"""TAM(스마트폰 SET 시장 전망) 예측치를 담는 SQLite 저장소.

스키마
------
forecast: (vintage, vendor, year) 단위의 예측치 원본 테이블.
  - vintage: 예측이 발표된 시점, 'YYYY-MM' 형식 문자열 (예: '2026-06')
  - value: NULL 허용 (원본 소스가 비어 있으면 NULL, 0으로 임의 치환하지 않음)

뷰
----
v_yoy: 같은 vintage 안에서 전년 대비(YoY) 계산 (year >= 2026 대상).
v_revision: 같은 (vendor, year)를 vintage 오름차순으로 봤을 때 직전 vintage 대비 리비전.
v_latest: 가장 최신 vintage(문자열 비교상 최대값)의 전체 행.

이 모듈은 stdlib sqlite3만 사용한다.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS forecast(
  vintage TEXT NOT NULL,
  vendor  TEXT NOT NULL,
  year    INTEGER NOT NULL,
  value   REAL,
  source_file TEXT,
  loaded_at TEXT,
  PRIMARY KEY (vintage, vendor, year)
);
"""

# NULL-safe 나눗셈: prev 값이 NULL이거나 0이면 비율은 NULL로 둔다.
# (SQLite는 REAL 0으로 나누면 NULL이 아니라 inf/NaN을 반환하므로 CASE로 직접 막아야 한다.)
VIEW_YOY_SQL = """
CREATE VIEW IF NOT EXISTS v_yoy AS
SELECT
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
  ON p.vintage = f.vintage AND p.vendor = f.vendor AND p.year = f.year - 1
WHERE f.year >= 2026;
"""

VIEW_REVISION_SQL = """
CREATE VIEW IF NOT EXISTS v_revision AS
WITH ordered AS (
  SELECT
    vintage,
    vendor,
    year,
    value,
    LAG(value) OVER (PARTITION BY vendor, year ORDER BY vintage ASC) AS prev_value
  FROM forecast
)
SELECT
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

VIEW_LATEST_SQL = """
CREATE VIEW IF NOT EXISTS v_latest AS
SELECT *
FROM forecast
WHERE vintage = (SELECT MAX(vintage) FROM forecast);
"""


def init_db(path) -> sqlite3.Connection:
    """path의 SQLite 파일에 연결하고, 스키마/뷰가 없으면 생성한다."""
    conn = sqlite3.connect(Path(path))
    conn.executescript(SCHEMA_SQL)
    conn.executescript(VIEW_YOY_SQL)
    conn.executescript(VIEW_REVISION_SQL)
    conn.executescript(VIEW_LATEST_SQL)
    conn.commit()
    return conn


def upsert_vintage(conn: sqlite3.Connection, vintage: str, rows, source_file: str) -> None:
    """해당 vintage의 기존 행을 삭제하고 rows로 다시 채운다 (같은 vintage 재적재는 멱등).

    rows: (vendor, year, value) 튜플의 리스트. value는 None일 수 있다 (그대로 NULL 저장).
    DELETE와 INSERT를 한 트랜잭션으로 묶어 커밋하므로, 재적재 중간 상태가 남지 않는다.
    """
    loaded_at = datetime.now(timezone.utc).isoformat()
    conn.execute("DELETE FROM forecast WHERE vintage = ?", (vintage,))
    conn.executemany(
        "INSERT INTO forecast (vintage, vendor, year, value, source_file, loaded_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        [(vintage, vendor, year, value, source_file, loaded_at) for vendor, year, value in rows],
    )
    conn.commit()
