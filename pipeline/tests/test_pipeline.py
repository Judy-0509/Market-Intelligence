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
                "--source", str(jun_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(db_path),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"
        assert "Loaded vintage 2026-06" in out, out

        conn = sqlite3.connect(db_path)
        try:
            count = conn.execute(
                "SELECT COUNT(*) FROM forecast WHERE vintage = ?", ("2026-06",)
            ).fetchone()[0]
            assert count == 42, f"expected 14 vendors x 3 years = 42 rows, got {count}"

            def val(vendor, year):
                row = conn.execute(
                    "SELECT value FROM forecast WHERE vintage=? AND vendor=? AND year=?",
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
                "--source", str(jun_revised_path),
                "--sheet", "6월 연전망용",
                "--vintage", "2026-06",
                "--db", str(db_path),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        conn = sqlite3.connect(db_path)
        try:
            count = conn.execute(
                "SELECT COUNT(*) FROM forecast WHERE vintage=?", ("2026-06",)
            ).fetchone()[0]
            assert count == 42, f"expected still 42 rows after reload (no duplicates), got {count}"

            value = conn.execute(
                "SELECT value FROM forecast WHERE vintage=? AND vendor=? AND year=?",
                ("2026-06", "MX", 2026),
            ).fetchone()[0]
            assert value == 999.0, f"expected replaced value 999.0, got {value}"
        finally:
            conn.close()

    def test_jul_load_and_revision():
        code, out, err = _run_cli(
            [
                "--source", str(jul_path),
                "--sheet", "7월 연전망용",
                "--vintage", "2026-07",
                "--db", str(db_path),
            ]
        )
        assert code == 0, f"expected exit 0, got {code}. stderr={err}"

        conn = sqlite3.connect(db_path)
        try:
            row = conn.execute(
                "SELECT delta, delta_pct FROM v_revision WHERE vendor=? AND year=? AND vintage=?",
                ("Apple", 2026, "2026-07"),
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
                    "SELECT value, prev_value, yoy FROM v_yoy WHERE vintage=? AND vendor=? AND year=?",
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
                "--source", str(ambiguous_path),
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
                "--source", str(no_apostrophe_path),
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
                "--source", str(missing_vendor_path),
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

    tests = [
        ("jun fixture load -> 14x3 rows + spot-check", test_jun_load),
        ("idempotent re-load replaces values, no duplicates", test_idempotent_reload),
        ("jul load -> v_revision delta for known vendor/year", test_jul_load_and_revision),
        ("v_yoy correct incl. NULL-safety (prev NULL / prev 0)", test_v_yoy),
        ("v_latest returns only the latest (jul) vintage", test_v_latest),
        ("locator negative: ambiguous duplicate '26 label", test_locator_ambiguous_header),
        ("locator negative: non-apostrophe year must not match", test_locator_rejects_non_apostrophe_year),
        ("vendor negative: missing canonical vendor", test_vendor_missing),
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
