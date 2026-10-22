"""Public acknowledgement, invite single-use, and claim-registry races. No live Supabase."""

from __future__ import annotations

import threading
from datetime import UTC, datetime
from types import SimpleNamespace

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.models.enums import AnalysisStatus, PaymentProvider, RiskSeverity
from app.schemas import AnalysisResult, ExtractedTransaction, PublicSubmissionAck, RiskSignal
from app.services.pipeline import AnalysisPipeline
from app.services.transaction_claims import ClaimResult, register_claim

client = TestClient(app)


def _full_result() -> AnalysisResult:
    now = datetime.now(UTC)
    return AnalysisResult(
        id="analysis-1",
        status=AnalysisStatus.SUSPICIOUS,
        provider=PaymentProvider.EASYPAISA,
        extracted=ExtractedTransaction(transaction_id="SECRET-1", payee_hint="0300"),
        signals=[
            RiskSignal(code="TXN_REUSED", severity=RiskSeverity.HIGH, message="prior analysis-9")
        ],
        created_at=now,
        updated_at=now,
        screenshot_url="https://signed.example/secret",
        expected_amount=5000,
        submitter_phone="03001234567",
    )


def test_public_submission_does_not_disclose_screening(monkeypatch) -> None:
    async def fake_run(self: AnalysisPipeline, **kwargs: object) -> AnalysisResult:
        _ = self, kwargs
        return _full_result()

    monkeypatch.setattr(AnalysisPipeline, "run", fake_run)
    monkeypatch.setattr(
        "app.api.public.get_merchant_by_slug",
        lambda slug: {"id": "merchant-1", "slug": slug},
    )
    monkeypatch.setattr(
        "app.api.public.find_or_create_order",
        lambda *args, **kwargs: ("order-1", "MV-1", 5000.0),
    )
    response = client.post(
        "/api/v1/public/submissions",
        data={"merchant_slug": "manoversa", "order_reference": "MV-1"},
        files={"file": ("proof.png", b"not-a-real-image", "image/png")},
    )
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "received"}
    assert body == {"id": "analysis-1", "received": True}
    leaked = response.text.lower()
    assert "txn_reused" not in leaked
    assert "signed.example" not in leaked
    assert "secret" not in leaked
    assert "03001234567" not in leaked
    PublicSubmissionAck.model_validate(body)


class _InviteDB:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.row = {
            "id": "invite-1",
            "token": "tok",
            "merchant_id": "merchant-1",
            "order_id": "order-1",
            "used_at": None,
            "analysis_id": None,
            "expires_at": "2099-01-01T00:00:00+00:00",
            "invited_phone": None,
            "orders": {"order_reference": "MV-1", "expected_amount": 10},
            "merchants": {"name": "Shop", "slug": "shop"},
        }

    def table(self, _name: str) -> _InviteQuery:
        return _InviteQuery(self)


class _InviteQuery:
    def __init__(self, db: _InviteDB) -> None:
        self.db = db
        self.op = "select"
        self.patch: dict | None = None
        self.filters: list[tuple[str, str, object]] = []

    def select(self, *_args: object, **_kwargs: object) -> _InviteQuery:
        self.op = "select"
        return self

    def update(self, patch: dict) -> _InviteQuery:
        self.op = "update"
        self.patch = patch
        return self

    def eq(self, key: str, value: object) -> _InviteQuery:
        self.filters.append(("eq", key, value))
        return self

    def is_(self, key: str, value: object) -> _InviteQuery:
        self.filters.append(("is", key, value))
        return self

    def gt(self, key: str, value: object) -> _InviteQuery:
        self.filters.append(("gt", key, value))
        return self

    def limit(self, _n: int) -> _InviteQuery:
        return self

    def execute(self) -> SimpleNamespace:
        with self.db.lock:
            row = self.db.row
            if self.op == "select":
                token = next(
                    value for op, key, value in self.filters if op == "eq" and key == "token"
                )
                if row["token"] == token:
                    return SimpleNamespace(data=[dict(row)])
                return SimpleNamespace(data=[])
            assert self.patch is not None
            for op, key, value in self.filters:
                if op == "eq" and str(row.get(key)) != str(value):
                    return SimpleNamespace(data=[])
                if (
                    op == "is"
                    and key == "used_at"
                    and value == "null"
                    and row.get("used_at") is not None
                ):
                    return SimpleNamespace(data=[])
                if (
                    op == "gt"
                    and key == "expires_at"
                    and not (str(row.get("expires_at")) > str(value))
                ):
                    return SimpleNamespace(data=[])
            row.update(self.patch)
            return SimpleNamespace(data=[dict(row)])


def test_consumed_invite_is_not_reused(monkeypatch) -> None:
    from app.services.invites import claim_invite_for_submission

    db = _InviteDB()
    monkeypatch.setattr("app.services.invites.require_supabase", lambda: db)
    first = claim_invite_for_submission("tok")
    assert first["id"] == "invite-1"
    try:
        claim_invite_for_submission("tok")
        raised = False
    except HTTPException as exc:
        raised = True
        assert exc.status_code == 409
    assert raised
    assert db.row["used_at"] is not None


def test_concurrent_invite_claims_allow_one_winner(monkeypatch) -> None:
    from app.services.invites import claim_invite_for_submission

    db = _InviteDB()
    monkeypatch.setattr("app.services.invites.require_supabase", lambda: db)
    winners: list[str] = []
    conflicts: list[int] = []

    def attempt() -> None:
        try:
            claim_invite_for_submission("tok")
        except HTTPException as exc:
            conflicts.append(exc.status_code)
        else:
            winners.append("ok")

    threads = [threading.Thread(target=attempt) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert winners == ["ok"]
    assert conflicts == [409] * 7


class _ClaimDB:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.keys: set[tuple[str, str, str]] = set()

    def table(self, _name: str) -> _ClaimInsert:
        return _ClaimInsert(self)


class _ClaimInsert:
    def __init__(self, db: _ClaimDB) -> None:
        self.db = db
        self.row: dict | None = None

    def insert(self, row: dict) -> _ClaimInsert:
        self.row = row
        return self

    def execute(self) -> SimpleNamespace:
        assert self.row is not None
        key = (
            self.row["merchant_id"],
            self.row["provider"],
            self.row["normalized_reference"],
        )
        with self.db.lock:
            if key in self.db.keys:
                raise RuntimeError("duplicate key value violates unique constraint 23505")
            self.db.keys.add(key)
        return SimpleNamespace(data=[self.row])


def test_concurrent_transaction_claims_keep_one_owner(monkeypatch) -> None:
    db = _ClaimDB()
    monkeypatch.setattr("app.services.transaction_claims.require_supabase", lambda: db)
    results: list[ClaimResult] = []
    barrier = threading.Barrier(8)

    def attempt(index: int) -> None:
        barrier.wait()
        results.append(
            register_claim(
                merchant_id="merchant-1",
                provider=PaymentProvider.EASYPAISA,
                normalized_reference="EP12345",
                analysis_id=f"analysis-{index}",
            )
        )

    threads = [threading.Thread(target=attempt, args=(index,)) for index in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert results.count(ClaimResult.RECORDED) == 1
    assert results.count(ClaimResult.DUPLICATE) == 7
    assert len(db.keys) == 1


def test_public_submission_is_rate_limited(monkeypatch) -> None:
    from app.services.rate_limit import reset_public_limits

    monkeypatch.setattr("app.services.rate_limit.PUBLIC_SUBMISSION_LIMIT", 2)
    reset_public_limits()
    try:
        codes = [client.post("/api/v1/public/submissions").status_code for _ in range(3)]
    finally:
        reset_public_limits()
    assert codes[-1] == 429
    assert 429 not in codes[:2]


def test_attestation_requires_a_merchant_session() -> None:
    response = client.post(
        "/api/v1/analyses/analysis-1/attestation",
        json={"decision": "NOT_FOUND"},
    )
    assert response.status_code == 401


def test_unknown_attestation_decision_is_rejected() -> None:
    from app.services.analyses import record_attestation

    try:
        record_attestation("merchant-1", "analysis-1", "user-1", "FRAUD", None)
    except HTTPException as exc:
        assert exc.status_code == 422
    else:
        raise AssertionError("expected 422")


def test_attestation_does_not_cover_another_merchant(monkeypatch) -> None:
    from app.services.analyses import record_attestation

    class Store:
        def __init__(self) -> None:
            self.inserted: dict | None = None

        def table(self, name: str) -> Query:
            return Query(self, name)

    class Query:
        def __init__(self, store: Store, name: str) -> None:
            self.store = store
            self.name = name
            self.payload: dict | None = None

        def select(self, *_args: object, **_kwargs: object) -> Query:
            return self

        def eq(self, *_args: object, **_kwargs: object) -> Query:
            return self

        def limit(self, *_args: object) -> Query:
            return self

        def insert(self, row: dict) -> Query:
            self.payload = row
            return self

        def execute(self) -> SimpleNamespace:
            if self.payload is not None:
                self.store.inserted = self.payload
                return SimpleNamespace(data=[self.payload])
            if self.name == "analyses":
                return SimpleNamespace(data=[])
            return SimpleNamespace(data=[])

    store = Store()
    monkeypatch.setattr("app.services.analyses.require_supabase", lambda: store)
    try:
        record_attestation("merchant-1", "analysis-9", "user-1", "NOT_FOUND", "checked the wallet")
    except HTTPException as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("expected 404")
    assert store.inserted is None
