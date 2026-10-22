"""Cross-merchant registry against disposable Postgres. Skipped unless YAQEEN_TEST_PG_DSN is set.

Not a mock. Example:
  YAQEEN_TEST_PG_DSN="host=127.0.0.1 port=55432 user=postgres dbname=yaqeen_phase1"
"""

from __future__ import annotations

import os
import subprocess
import threading
import uuid
from pathlib import Path

import pytest

from app.services.network_claims import fingerprint

DSN = os.environ.get("YAQEEN_TEST_PG_DSN", "")
PSQL = os.environ.get("YAQEEN_PSQL", r"C:\Program Files\PostgreSQL\17\bin\psql.exe")
pytestmark = pytest.mark.skipif(
    not DSN or not Path(PSQL).exists(),
    reason="disposable Postgres is not configured",
)

ROOT = Path(__file__).resolve().parents[3]
MIGRATION = ROOT / "supabase" / "migrations" / "20261021000000_network_claims.sql"


def _run(sql: str) -> str:
    env = os.environ.copy()
    # libpq connection string via PG* is awkward; pass conninfo as the database argument.
    result = subprocess.run(
        [PSQL, DSN, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return result.stdout.strip()


def _apply_migration() -> None:
    result = subprocess.run(
        [PSQL, DSN, "-v", "ON_ERROR_STOP=1", "-f", str(MIGRATION)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)


def test_cross_merchant_observation_hides_the_other_merchant() -> None:
    _apply_migration()
    merchant_a = str(uuid.uuid4())
    merchant_b = str(uuid.uuid4())
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    analysis_a = str(uuid.uuid4())
    analysis_b = str(uuid.uuid4())
    digest = fingerprint("EASYPAISA", uuid.uuid4().hex, "phase2-test-key")
    _run(
        f"""
        insert into merchants (id, name, slug) values
          ('{merchant_a}', 'Shop A', 'shop-a-{merchant_a[:8]}'),
          ('{merchant_b}', 'Shop B', 'shop-b-{merchant_b[:8]}');
        insert into merchant_users (merchant_id, auth_user_id, role) values
          ('{merchant_a}', '{user_a}', 'owner'),
          ('{merchant_b}', '{user_b}', 'owner');
        insert into analyses (id, merchant_id, status, provider, disclaimer, source) values
          ('{analysis_a}', '{merchant_a}', 'MANUAL_REVIEW', 'EASYPAISA', 'd', 'upload'),
          ('{analysis_b}', '{merchant_b}', 'MANUAL_REVIEW', 'EASYPAISA', 'd', 'upload');
        """
    )
    first = _run(
        "select register_network_observation("
        f"'{digest}', 'EASYPAISA', '{merchant_a}', '{analysis_a}');"
    )
    second = _run(
        "select register_network_observation("
        f"'{digest}', 'EASYPAISA', '{merchant_b}', '{analysis_b}');"
    )
    assert first == "f"
    assert second == "t"
    assert (
        _run(f"select count(*) from analyses where id in ('{analysis_a}', '{analysis_b}');") == "2"
    )
    short = _run(
        f"select register_network_observation('abcd', 'EASYPAISA', '{merchant_a}', '{analysis_a}');"
    )
    assert short == "f"
    if _run("select 1 from pg_roles where rolname = 'yaqeen_reader'") != "1":
        subprocess.run(
            [
                PSQL,
                DSN,
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                "create role yaqeen_reader nosuperuser nologin",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    reader = _run(
        """
        grant usage on schema public to yaqeen_reader;
        grant select on network_identities to yaqeen_reader;
        set role yaqeen_reader;
        select count(*) from network_identities;
        """
    )
    assert reader.endswith("0")
    denied = subprocess.run(
        [
            PSQL,
            DSN,
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            (
                "set role yaqeen_reader; select register_network_observation("
                f"'{digest}', 'EASYPAISA', '{merchant_b}', '{analysis_b}');"
            ),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    assert denied.returncode != 0


def test_concurrent_observations_keep_both_analyses() -> None:
    _apply_migration()
    merchant_a = str(uuid.uuid4())
    merchant_b = str(uuid.uuid4())
    analysis_a = str(uuid.uuid4())
    analysis_b = str(uuid.uuid4())
    digest = fingerprint("JAZZCASH", uuid.uuid4().hex, "phase2-test-key")
    _run(
        f"""
        insert into merchants (id, name, slug) values
          ('{merchant_a}', 'Race A', 'race-a-{merchant_a[:8]}'),
          ('{merchant_b}', 'Race B', 'race-b-{merchant_b[:8]}');
        insert into analyses (id, merchant_id, status, provider, disclaimer, source) values
          ('{analysis_a}', '{merchant_a}', 'MANUAL_REVIEW', 'JAZZCASH', 'd', 'upload'),
          ('{analysis_b}', '{merchant_b}', 'MANUAL_REVIEW', 'JAZZCASH', 'd', 'upload');
        """
    )
    results: list[str] = []

    def call(merchant: str, analysis: str) -> None:
        results.append(
            _run(
                "select register_network_observation("
                f"'{digest}', 'JAZZCASH', '{merchant}', '{analysis}');"
            )
        )

    threads = [
        threading.Thread(target=call, args=(merchant_a, analysis_a)),
        threading.Thread(target=call, args=(merchant_b, analysis_b)),
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(results) == ["f", "t"]
    assert (
        _run(
            "select count(*) from network_observations where analysis_id in "
            f"('{analysis_a}', '{analysis_b}');"
        )
        == "2"
    )


def test_invite_lifecycle_and_attestation_isolation() -> None:
    """Disposable Postgres. Invite expiry, reuse, and attestation tenant boundary."""
    _apply_migration()
    merchant_a = str(uuid.uuid4())
    merchant_b = str(uuid.uuid4())
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    order_id = str(uuid.uuid4())
    analysis_a = str(uuid.uuid4())
    open_token = f"open-{uuid.uuid4().hex}"
    expired_token = f"expired-{uuid.uuid4().hex}"
    _run(
        f"""
        insert into merchants (id, name, slug) values
          ('{merchant_a}', 'Shop A', 'iso-a-{merchant_a[:8]}'),
          ('{merchant_b}', 'Shop B', 'iso-b-{merchant_b[:8]}');
        insert into merchant_users (merchant_id, auth_user_id, role) values
          ('{merchant_a}', '{user_a}', 'owner'),
          ('{merchant_b}', '{user_b}', 'owner');
        insert into orders (id, merchant_id, order_reference, expected_amount)
        values ('{order_id}', '{merchant_a}', 'SYN-1', 5000);
        insert into analyses (
          id, merchant_id, status, provider, disclaimer, source, submitter_phone
        ) values (
          '{analysis_a}', '{merchant_a}', 'MANUAL_REVIEW', 'EASYPAISA', 'd', 'upload', '03001111111'
        );
        insert into proof_invites (token, merchant_id, order_id, expires_at) values
          ('{open_token}', '{merchant_a}', '{order_id}', now() + interval '1 day'),
          ('{expired_token}', '{merchant_a}', '{order_id}', now() - interval '1 day');
        insert into merchant_attestations (analysis_id, merchant_id, decision, note, auth_user_id)
        values ('{analysis_a}', '{merchant_a}', 'NOT_FOUND', 'synthetic wallet check', '{user_a}');
        """
    )
    _run(
        """
        create or replace function auth.uid() returns uuid language sql stable as $$
          select nullif(current_setting('yaqeen.uid', true), '')::uuid
        $$;
        """
    )
    expired = _run(
        "with updated as ("
        "update proof_invites set used_at = now() "
        f"where token = '{expired_token}' and used_at is null and expires_at > now() "
        "returning 1) select count(*) from updated;"
    )
    assert expired == "0"
    first = _run(
        "with updated as ("
        "update proof_invites set used_at = now() "
        f"where token = '{open_token}' and used_at is null and expires_at > now() "
        "returning 1) select count(*) from updated;"
    )
    second = _run(
        "with updated as ("
        "update proof_invites set used_at = now() "
        f"where token = '{open_token}' and used_at is null and expires_at > now() "
        "returning 1) select count(*) from updated;"
    )
    assert first == "1"
    assert second == "0"
    if _run("select 1 from pg_roles where rolname = 'yaqeen_reader'") != "1":
        subprocess.run(
            [
                PSQL,
                DSN,
                "-v",
                "ON_ERROR_STOP=1",
                "-c",
                "create role yaqeen_reader nosuperuser nologin",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    _run(
        """
        grant usage on schema public to yaqeen_reader;
        grant select on all tables in schema public to yaqeen_reader;
        """
    )
    seen_by_b = _run(
        "set role yaqeen_reader; "
        f"select set_config('yaqeen.uid', '{user_b}', false); "
        f"select count(*) from analyses where id = '{analysis_a}';"
    )
    seen_attestations = _run(
        "set role yaqeen_reader; "
        f"select set_config('yaqeen.uid', '{user_b}', false); "
        f"select count(*) from merchant_attestations where analysis_id = '{analysis_a}';"
    )
    seen_by_a = _run(
        "set role yaqeen_reader; "
        f"select set_config('yaqeen.uid', '{user_a}', false); "
        f"select submitter_phone from analyses where id = '{analysis_a}';"
    )
    assert seen_by_b.endswith("0")
    assert seen_attestations.endswith("0")
    assert seen_by_a.endswith("03001111111")
