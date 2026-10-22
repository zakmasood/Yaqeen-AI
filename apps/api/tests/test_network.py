"""Cross-merchant fingerprints. Synthetic references, no live database."""

from types import SimpleNamespace

from app.models.enums import AnalysisStatus, PaymentProvider
from app.schemas import ExtractedTransaction
from app.services.network_claims import (
    NetworkCheck,
    fingerprint,
    observe_network,
    reference_can_identify,
)
from app.services.screening import collect_screening_outcome
from app.services.txn_ref import normalize_transaction_reference


def test_fingerprint_includes_provider_namespace() -> None:
    left = fingerprint("EASYPAISA", "EP12345678", "test-key")
    right = fingerprint("JAZZCASH", "EP12345678", "test-key")
    assert left != right
    assert len(left) == 64
    assert "EP12345678" not in left


def test_normalization_collision_and_lookalikes() -> None:
    key = "test-key"
    same_a = normalize_transaction_reference("EP-12345678")
    same_b = normalize_transaction_reference("ep 12345678")
    assert same_a == same_b
    assert fingerprint("EASYPAISA", same_a or "", key) == fingerprint(
        "EASYPAISA", same_b or "", key
    )
    look_a = normalize_transaction_reference("AB-12")
    look_b = normalize_transaction_reference("12-AB")
    assert look_a != look_b
    assert reference_can_identify(PaymentProvider.EASYPAISA, look_a) is False
    assert reference_can_identify(PaymentProvider.UNKNOWN, "EP12345678") is False
    assert reference_can_identify(PaymentProvider.EASYPAISA, None) is False
    assert reference_can_identify(PaymentProvider.EASYPAISA, "EP12345678") is True


def test_missing_key_does_not_record(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.network_claims.get_settings",
        lambda: SimpleNamespace(network_claim_key=""),
    )
    assert (
        observe_network(
            merchant_id="merchant-b",
            provider=PaymentProvider.EASYPAISA,
            normalized_reference="EP12345678",
            analysis_id="analysis-b",
        )
        == NetworkCheck.UNAVAILABLE
    )


def test_observe_sends_fingerprint_not_raw_reference(monkeypatch) -> None:
    captured: dict = {}

    class Fake:
        def rpc(self, name: str, args: dict) -> object:
            captured["name"] = name
            captured["args"] = args
            return self

        def execute(self) -> SimpleNamespace:
            return SimpleNamespace(data=True)

    monkeypatch.setattr(
        "app.services.network_claims.get_settings",
        lambda: SimpleNamespace(network_claim_key="test-key"),
    )
    monkeypatch.setattr("app.services.network_claims.require_supabase", lambda: Fake())
    assert (
        observe_network(
            merchant_id="merchant-b",
            provider=PaymentProvider.EASYPAISA,
            normalized_reference="EP12345678",
            analysis_id="analysis-b",
        )
        == NetworkCheck.CHECKED_MATCH
    )
    assert captured["name"] == "register_network_observation"
    assert captured["args"]["p_fingerprint"] != "EP12345678"
    assert "merchant-a" not in str(captured["args"])


def test_network_signal_is_review_not_fraud() -> None:
    extracted = ExtractedTransaction(
        provider=PaymentProvider.EASYPAISA,
        amount=5000,
        currency="PKR",
        transaction_id="EP12345678",
        payee_hint="03001234567",
    )
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={"ok": True},
        duplicate_ids=[],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
        network_check=NetworkCheck.CHECKED_MATCH,
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert status != AnalysisStatus.SUSPICIOUS
    network = next(signal for signal in signals if signal.code == "NETWORK_REFERENCE_REUSED")
    assert network.related_analysis_id is None
    assert "not confirmation of fraud" in network.message
    assert "merchant-a" not in network.message.lower()


def test_same_merchant_link_is_not_attached_to_network_signal() -> None:
    extracted = ExtractedTransaction(
        provider=PaymentProvider.EASYPAISA,
        amount=5000,
        currency="PKR",
        transaction_id="EP12345678",
        payee_hint="03001234567",
    )
    _status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={"ok": True},
        duplicate_ids=["analysis-earlier"],
        network_check=NetworkCheck.CHECKED_MATCH,
    )
    reused = next(signal for signal in signals if signal.code == "TXN_REUSED")
    network = next(signal for signal in signals if signal.code == "NETWORK_REFERENCE_REUSED")
    assert reused.related_analysis_id == "analysis-earlier"
    assert network.related_analysis_id is None


def test_short_reference_is_skipped_without_a_lookup(monkeypatch) -> None:
    def fail_client() -> None:
        raise AssertionError("registry should not be called")

    monkeypatch.setattr("app.services.network_claims.require_supabase", fail_client)
    assert (
        observe_network(
            merchant_id="merchant-b",
            provider=PaymentProvider.EASYPAISA,
            normalized_reference="AB12",
            analysis_id="analysis-b",
        )
        == NetworkCheck.SKIPPED
    )


def test_registry_failure_is_unavailable_and_omits_the_reference(monkeypatch, caplog) -> None:
    import logging

    class Boom:
        def rpc(self, _name: str, args: dict) -> None:
            raise RuntimeError(f"secret {args['p_fingerprint']} EP12345678")

    monkeypatch.setattr(
        "app.services.network_claims.get_settings",
        lambda: SimpleNamespace(network_claim_key="test-key"),
    )
    monkeypatch.setattr("app.services.network_claims.require_supabase", lambda: Boom())
    with caplog.at_level(logging.ERROR):
        result = observe_network(
            merchant_id="merchant-b",
            provider=PaymentProvider.EASYPAISA,
            normalized_reference="EP12345678",
            analysis_id="analysis-b",
        )
    assert result == NetworkCheck.UNAVAILABLE
    assert "EP12345678" not in caplog.text
    assert "secret" not in caplog.text
    status, signals = collect_screening_outcome(
        extracted=ExtractedTransaction(
            provider=PaymentProvider.EASYPAISA,
            amount=5000,
            currency="PKR",
            transaction_id="EP12345678",
            payee_hint="03001234567",
        ),
        vision_result={"ok": True},
        duplicate_ids=[],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
        network_check=result,
    )
    assert status == AnalysisStatus.READY_FOR_CONFIRMATION
    assert not any(signal.code == "NETWORK_REFERENCE_REUSED" for signal in signals)
    assert any(signal.code == "NETWORK_CHECK_UNAVAILABLE" for signal in signals)


def test_clean_miss_stays_ready() -> None:
    status, signals = collect_screening_outcome(
        extracted=ExtractedTransaction(
            provider=PaymentProvider.EASYPAISA,
            amount=5000,
            currency="PKR",
            transaction_id="EP12345678",
            payee_hint="03001234567",
        ),
        vision_result={"ok": True},
        duplicate_ids=[],
        expected_amount=5000,
        expected_currency="PKR",
        expected_provider=PaymentProvider.EASYPAISA,
        expected_payee="03001234567",
        network_check=NetworkCheck.CHECKED_NO_MATCH,
    )
    assert status == AnalysisStatus.READY_FOR_CONFIRMATION
    assert any(signal.code == "NETWORK_CHECK_CLEAR" for signal in signals)
    assert not any(signal.code == "NETWORK_REFERENCE_REUSED" for signal in signals)
