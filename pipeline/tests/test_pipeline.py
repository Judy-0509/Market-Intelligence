"""pipeline 통합 테스트 (plain assert, pytest 미사용).

실행: python pipeline/tests/test_pipeline.py  (저장소 루트에서, 또는 이 폴더 안에서도 동작)
전부 통과하면 종료 코드 0, 하나라도 실패하면 0이 아닌 값을 반환한다.
"""
from __future__ import annotations

import contextlib
import io
import sqlite3
import sys
import tempfile
import traceback
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
PIPELINE_DIR = TESTS_DIR.parent
sys.path.insert(0, str(PIPELINE_DIR))
sys.path.insert(0, str(TESTS_DIR))

import load_forecast  # noqa: E402
import make_fixture  # noqa: E402


def _run_cli(args):
    """load_forecast.main()을 호출하고 (exit_code, stdout, stderr)를 반환한다."""
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = load_forecast.main(args)
    return code, out.getvalue(), err.getvalue()


def main() -> int:
    tmp_dir = Path(tempfile.mkdtemp(prefix="tam_pipeline_test_"))
    fixtures_dir = tmp_dir / "fixtures"
    db_path = tmp_dir / "tam_test.db"

    jun_path, jul_path = make_fixture.make_valid_fixtures(fixtures_dir)
    jun_revised_path = make_fixture.make_jun_revised_fixture(fixtures_dir)
    ambiguous_path = make_fixture.make_ambiguous_header_fixture(fixtures_dir)
    no_apostrophe_path = make_fixture.make_no_apostrophe_year_fixture(fixtures_dir)
    missing_vendor_path = make_fixture.make_missing_vendor_fixture(fixtures_dir)

    def test_jun_load():
        code, out, err = _run_cli(
            [
                "--file", str(jun_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(db_path),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"
        assert "Loaded vintage 2026-06" in out, out
        assert "source: S.LSI" in out, "default --source must be S.LSI: " + out

        conn = sqlite3.connect(db_path)
        try:
            count = conn.execute(
                "SELECT COUNT(*) FROM forecast WHERE source='S.LSI' AND vintage = ?", ("2026-06",)
            ).fetchone()[0]
            assert count == 42, f"expected 14 vendors x 3 years = 42 rows, got {count}"

            def val(vendor, year):
                row = conn.execute(
                    "SELECT value FROM forecast WHERE source='S.LSI' AND vintage=? AND vendor=? AND year=?",
                    ("2026-06", vendor, year),
                ).fetchone()
                assert row is not None, f"missing row for {vendor}/{year}"
                return row[0]

            assert val("MX", 2025) == 100.0
            assert val("MX", 2026) == 105.0
            assert val("MX", 2027) == 110.0
            assert val("Total", 2026) == 1405.0
            assert val("Huawei", 2025) is None, "blank source cell must load as NULL"
            assert val("Honor", 2025) == 0.0, "explicit zero must be stored as 0, not NULL"
        finally:
            conn.close()

    def test_idempotent_reload():
        code, out, err = _run_cli(
            [
                "--file", str(jun_revised_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(db_path),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        conn = sqlite3.connect(db_path)
        try:
            count = conn.execute(
                "SELECT COUNT(*) FROM forecast WHERE source='S.LSI' AND vintage=?", ("2026-06",)
            ).fetchone()[0]
            assert count == 42, f"expected still 42 rows after reload (no duplicates), got {count}"

            value = conn.execute(
                "SELECT value FROM forecast WHERE source='S.LSI' AND vintage=? AND vendor=? AND year=?",
                ("2026-06", "MX", 2026),
            ).fetchone()[0]
            assert value == 999.0, f"expected replaced value 999.0, got {value}"
        finally:
            conn.close()

    def test_jul_load_and_revision():
        code, out, err = _run_cli(
            [
                "--file", str(jul_path),
                "--sheet", "7월 연전망용",
                "--vintage", "2026-07",
                "--db", str(db_path),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        conn = sqlite3.connect(db_path)
        try:
            row = conn.execute(
                "SELECT delta, delta_pct FROM v_revision WHERE source=? AND vendor=? AND year=? AND vintage=?",
                ("S.LSI", "Apple", 2026, "2026-07"),
            ).fetchone()
            assert row is not None, "no v_revision row for Apple/2026/2026-07"
            delta, delta_pct = row

            expected_jul = make_fixture.vendor_value(1, 2026, 7)
            expected_jun = make_fixture.vendor_value(1, 2026, 6)
            expected_delta = expected_jul - expected_jun
            expected_delta_pct = expected_jul / expected_jun - 1

            assert abs(delta - expected_delta) < 1e-9, f"expected delta {expected_delta}, got {delta}"
            assert abs(delta_pct - expected_delta_pct) < 1e-9, (
                f"expected delta_pct {expected_delta_pct}, got {delta_pct}"
            )
        finally:
            conn.close()

    def test_v_yoy():
        conn = sqlite3.connect(db_path)
        try:
            def yoy_row(vendor, year, vintage):
                row = conn.execute(
                    "SELECT value, prev_value, yoy FROM v_yoy WHERE source='S.LSI' AND vintage=? AND vendor=? AND year=?",
                    (vintage, vendor, year),
                ).fetchone()
                assert row is not None, f"no v_yoy row for {vendor}/{year}/{vintage}"
                return row

            value, prev_value, yoy = yoy_row("Apple", 2026, "2026-06")
            expected_value = make_fixture.vendor_value(1, 2026, 6)
            expected_prev = make_fixture.vendor_value(1, 2025, 6)
            assert value == expected_value
            assert prev_value == expected_prev
            assert abs(yoy - (expected_value / expected_prev - 1)) < 1e-9

            _, prev_value, yoy = yoy_row("Huawei", 2026, "2026-06")
            assert prev_value is None, "Huawei/2025 should be NULL (blank source cell)"
            assert yoy is None, "yoy must be NULL-safe when prev is NULL"

            _, prev_value, yoy = yoy_row("Honor", 2026, "2026-06")
            assert prev_value == 0.0, "Honor/2025 should be exactly 0"
            assert yoy is None, "yoy must be NULL-safe when prev is 0"
        finally:
            conn.close()

    def test_v_latest():
        conn = sqlite3.connect(db_path)
        try:
            vintages = conn.execute("SELECT DISTINCT vintage FROM v_latest").fetchall()
            assert vintages == [("2026-07",)], f"expected only 2026-07, got {vintages}"
            count = conn.execute("SELECT COUNT(*) FROM v_latest").fetchone()[0]
            assert count == 42, f"expected 42 rows in v_latest, got {count}"
        finally:
            conn.close()

    def test_locator_ambiguous_header():
        scratch_db = tmp_dir / "scratch_ambiguous.db"
        code, out, err = _run_cli(
            [
                "--file", str(ambiguous_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(scratch_db),
            ]
        )
        assert code == 1, f"expected exit 1, got {code}"
        assert not scratch_db.exists(), "DB must not be created when extraction fails"
        message = out + err
        assert "Ambiguous years" in message, f"error should mention ambiguity: {message}"
        assert message.count("'26") >= 2, f"error should list both duplicate '26 labels: {message}"

    def test_locator_rejects_non_apostrophe_year():
        scratch_db = tmp_dir / "scratch_no_apostrophe.db"
        code, out, err = _run_cli(
            [
                "--file", str(no_apostrophe_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(scratch_db),
            ]
        )
        assert code == 1, f"expected exit 1, got {code}"
        assert not scratch_db.exists(), "DB must not be created when extraction fails"
        message = out + err
        assert "Missing years: [2026]" in message, f"2026 must be reported missing: {message}"
        # confirm the non-apostrophe labels were seen (scanned) yet correctly did not match
        assert "H: '26'" in message, f"scanned listing should show the plain '26' label: {message}"
        assert "K: '2026'" in message, f"scanned listing should show the plain '2026' label: {message}"

    def test_vendor_missing():
        scratch_db = tmp_dir / "scratch_missing_vendor.db"
        code, out, err = _run_cli(
            [
                "--file", str(missing_vendor_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(scratch_db),
            ]
        )
        assert code == 1, f"expected exit 1, got {code}"
        assert not scratch_db.exists(), "DB must not be created when extraction fails"
        message = out + err
        assert "Missing expected vendor" in message, f"error should mention missing vendor: {message}"
        assert "Local" in message, f"error should name the missing vendor: {message}"

    def test_two_sources_same_vintage_coexist():
        """S.LSI와 Omdia가 같은 vintage/vendor/year라도 서로를 덮어쓰지 않아야 한다."""
        scratch_db = tmp_dir / "scratch_multi_source.db"
        code, out, err = _run_cli(
            [
                "--file", str(jun_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(scratch_db),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        code, out, err = _run_cli(
            [
                "--file", str(jun_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--source", "Omdia",
                "--db", str(scratch_db),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"
        assert "source: Omdia" in out, out

        conn = sqlite3.connect(scratch_db)
        try:
            total = conn.execute("SELECT COUNT(*) FROM forecast").fetchone()[0]
            assert total == 84, f"expected 42+42=84 rows across both sources, got {total}"

            for source in ("S.LSI", "Omdia"):
                count = conn.execute(
                    "SELECT COUNT(*) FROM forecast WHERE source=? AND vintage=?", (source, "2026-06")
                ).fetchone()[0]
                assert count == 42, f"expected 42 rows for source={source}, got {count}"

                value = conn.execute(
                    "SELECT value FROM forecast WHERE source=? AND vintage=? AND vendor=? AND year=?",
                    (source, "2026-06", "MX", 2026),
                ).fetchone()[0]
                assert value == 105.0, f"source={source} MX/2026 expected 105.0, got {value}"
        finally:
            conn.close()

    def test_v_revision_partitioned_by_source():
        """Omdia의 jul-only 적재가 S.LSI의 jun->jul 리비전 계산에 영향을 주면 안 된다."""
        scratch_db = tmp_dir / "scratch_revision_source.db"
        for args in (
            ["--file", str(jun_path), "--sheet", "6월 연전망용", "--vintage", "2026-06", "--db", str(scratch_db)],
            ["--file", str(jul_path), "--sheet", "7월 연전망용", "--vintage", "2026-07", "--db", str(scratch_db)],
            ["--file", str(jul_path), "--sheet", "7월 연전망용", "--vintage", "2026-07",
             "--source", "Omdia", "--db", str(scratch_db)],
        ):
            code, out, err = _run_cli(args)
            assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        conn = sqlite3.connect(scratch_db)
        try:
            row = conn.execute(
                "SELECT delta, delta_pct FROM v_revision WHERE source=? AND vendor=? AND year=? AND vintage=?",
                ("S.LSI", "Apple", 2026, "2026-07"),
            ).fetchone()
            assert row is not None, "no v_revision row for S.LSI/Apple/2026/2026-07"
            delta, delta_pct = row

            expected_jul = make_fixture.vendor_value(1, 2026, 7)
            expected_jun = make_fixture.vendor_value(1, 2026, 6)
            expected_delta = expected_jul - expected_jun
            expected_delta_pct = expected_jul / expected_jun - 1
            assert abs(delta - expected_delta) < 1e-9, f"S.LSI delta unaffected by Omdia insert: {delta}"
            assert abs(delta_pct - expected_delta_pct) < 1e-9

            omdia_row = conn.execute(
                "SELECT prev_value, delta, delta_pct FROM v_revision "
                "WHERE source=? AND vendor=? AND year=? AND vintage=?",
                ("Omdia", "Apple", 2026, "2026-07"),
            ).fetchone()
            assert omdia_row is not None, "no v_revision row for Omdia/Apple/2026/2026-07"
            prev_value, omdia_delta, omdia_delta_pct = omdia_row
            assert prev_value is None, "Omdia has no earlier vintage -- prev_value must be NULL"
            assert omdia_delta is None, "delta must be NULL when prev_value is NULL"
            assert omdia_delta_pct is None, "delta_pct must be NULL when prev_value is NULL"
        finally:
            conn.close()

    def test_v_latest_per_source_symmetric():
        """S.LSI와 Omdia 둘 다 jun+jul을 적재하면, 둘 다 각자의 jul(최신)이 v_latest에 나온다."""
        scratch_db = tmp_dir / "scratch_latest_symmetric.db"
        for source in ("S.LSI", "Omdia"):
            for path, sheet, vintage in (
                (jun_path, "6월 연전망용", "2026-06"),
                (jul_path, "7월 연전망용", "2026-07"),
            ):
                code, out, err = _run_cli(
                    [
                        "--file", str(path),
                        "--sheet", sheet,
                        "--vintage", vintage,
                        "--source", source,
                        "--db", str(scratch_db),
                    ]
                )
                assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        conn = sqlite3.connect(scratch_db)
        try:
            pairs = set(conn.execute("SELECT DISTINCT source, vintage FROM v_latest").fetchall())
            assert pairs == {("S.LSI", "2026-07"), ("Omdia", "2026-07")}, pairs
            count = conn.execute("SELECT COUNT(*) FROM v_latest").fetchone()[0]
            assert count == 84, f"expected 42+42=84 rows in v_latest, got {count}"
        finally:
            conn.close()

    def test_v_latest_per_source_asymmetric():
        """S.LSI는 jul까지, Omdia는 jun까지만 있으면 Omdia의 jun 행이 v_latest에 그대로 남아야 한다."""
        scratch_db = tmp_dir / "scratch_latest_asymmetric.db"
        for args in (
            ["--file", str(jun_path), "--sheet", "6월 연전망용", "--vintage", "2026-06", "--db", str(scratch_db)],
            ["--file", str(jul_path), "--sheet", "7월 연전망용", "--vintage", "2026-07", "--db", str(scratch_db)],
            ["--file", str(jun_path), "--sheet", "6월 연전망용", "--vintage", "2026-06",
             "--source", "Omdia", "--db", str(scratch_db)],
        ):
            code, out, err = _run_cli(args)
            assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        conn = sqlite3.connect(scratch_db)
        try:
            pairs = set(conn.execute("SELECT DISTINCT source, vintage FROM v_latest").fetchall())
            assert pairs == {("S.LSI", "2026-07"), ("Omdia", "2026-06")}, pairs
            count = conn.execute("SELECT COUNT(*) FROM v_latest").fetchone()[0]
            assert count == 84, f"expected 42+42=84 rows in v_latest (asymmetric case), got {count}"

            omdia_rows = conn.execute("SELECT COUNT(*) FROM v_latest WHERE source='Omdia'").fetchone()[0]
            assert omdia_rows == 42, (
                "Omdia's own latest (2026-06) rows must appear even though S.LSI's latest is 2026-07"
            )
        finally:
            conn.close()

    def test_legacy_migration():
        """레거시(source 컬럼 없는) DB를 코드로 만들고, init_db가 이를 마이그레이션하는지 검증한다."""
        scratch_db = tmp_dir / "scratch_legacy_migration.db"

        legacy_conn = sqlite3.connect(scratch_db)
        try:
            legacy_conn.executescript(
                """
                CREATE TABLE forecast(
                  vintage TEXT NOT NULL,
                  vendor  TEXT NOT NULL,
                  year    INTEGER NOT NULL,
                  value   REAL,
                  source_file TEXT,
                  loaded_at TEXT,
                  PRIMARY KEY (vintage, vendor, year)
                );
                CREATE VIEW v_latest AS
                SELECT * FROM forecast WHERE vintage = (SELECT MAX(vintage) FROM forecast);
                """
            )
            legacy_conn.executemany(
                "INSERT INTO forecast (vintage, vendor, year, value, source_file, loaded_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                [
                    ("2026-05", "MX", 2026, 42.0, "legacy_file.xlsx", "2026-05-01T00:00:00+00:00"),
                    ("2026-05", "Apple", 2026, 84.0, "legacy_file.xlsx", "2026-05-01T00:00:00+00:00"),
                ],
            )
            legacy_conn.commit()
        finally:
            legacy_conn.close()

        conn = load_forecast.tam_db.init_db(scratch_db)
        try:
            rows = conn.execute(
                "SELECT source, vintage, vendor, year, value FROM forecast ORDER BY vendor"
            ).fetchall()
            assert rows == [
                ("S.LSI", "2026-05", "Apple", 2026, 84.0),
                ("S.LSI", "2026-05", "MX", 2026, 42.0),
            ], f"legacy rows must be preserved and attributed to S.LSI: {rows}"

            # new PK includes source -- a different source with the same
            # (vintage, vendor, year) must NOT collide.
            conn.execute(
                "INSERT INTO forecast (source, vintage, vendor, year, value, source_file, loaded_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("Omdia", "2026-05", "MX", 2026, 40.0, "omdia_file.xlsx", "2026-05-02T00:00:00+00:00"),
            )
            conn.commit()

            duplicate_rejected = False
            try:
                conn.execute(
                    "INSERT INTO forecast (source, vintage, vendor, year, value, source_file, loaded_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    ("S.LSI", "2026-05", "MX", 2026, 999.0, "dup.xlsx", "2026-05-03T00:00:00+00:00"),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                duplicate_rejected = True
                conn.rollback()
            assert duplicate_rejected, "expected PK violation for duplicate (source, vintage, vendor, year)"

            latest = conn.execute("SELECT DISTINCT source, vintage FROM v_latest ORDER BY source").fetchall()
            assert latest == [("Omdia", "2026-05"), ("S.LSI", "2026-05")], latest
        finally:
            conn.close()

        # second init_db run must be a clean no-op
        conn = load_forecast.tam_db.init_db(scratch_db)
        try:
            cols = [row[1] for row in conn.execute("PRAGMA table_info(forecast)").fetchall()]
            assert cols == ["source", "vintage", "vendor", "year", "value", "source_file", "loaded_at"], cols

            rows_after = conn.execute(
                "SELECT source, vintage, vendor, year, value FROM forecast ORDER BY source, vendor"
            ).fetchall()
            assert rows_after == [
                ("Omdia", "2026-05", "MX", 2026, 40.0),
                ("S.LSI", "2026-05", "Apple", 2026, 84.0),
                ("S.LSI", "2026-05", "MX", 2026, 42.0),
            ], f"second init_db run must not change data: {rows_after}"
        finally:
            conn.close()

    tests = [
        ("jun fixture load -> 14x3 rows + spot-check", test_jun_load),
        ("idempotent re-load replaces values, no duplicates", test_idempotent_reload),
        ("jul load -> v_revision delta for known vendor/year", test_jul_load_and_revision),
        ("v_yoy correct incl. NULL-safety (prev NULL / prev 0)", test_v_yoy),
        ("v_latest returns only the latest (jul) vintage", test_v_latest),
        ("locator negative: ambiguous duplicate '26 label", test_locator_ambiguous_header),
        ("locator negative: non-apostrophe year must not match", test_locator_rejects_non_apostrophe_year),
        ("vendor negative: missing canonical vendor", test_vendor_missing),
        ("two sources, same vintage/vendor/year coexist without clobbering", test_two_sources_same_vintage_coexist),
        ("v_revision partitions by source (Omdia jul-only unaffected)", test_v_revision_partitioned_by_source),
        ("v_latest per-source, symmetric (both sources latest = jul)", test_v_latest_per_source_symmetric),
        ("v_latest per-source, asymmetric (Omdia latest = jun)", test_v_latest_per_source_asymmetric),
        ("legacy schema migration: rows -> S.LSI, new PK, idempotent re-run", test_legacy_migration),
    ]

    failures = 0
    for name, fn in tests:
        try:
            fn()
        except Exception:
            failures += 1
            print(f"[FAIL] {name}")
            traceback.print_exc()
        else:
            print(f"[PASS] {name}")

    print()
    if failures:
        print(f"{failures} of {len(tests)} tests FAILED")
        return 1
    print(f"All {len(tests)} tests passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
