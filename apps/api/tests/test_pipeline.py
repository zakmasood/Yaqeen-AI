"""Screening pipeline unit tests — no live Supabase, no fake authenticity scores."""

from app.models.enums import AnalysisStatus
from app.schemas import ExtractedTransaction, WhatsAppWebhookPayload
from app.services.screening import collect_screening_outcome
from app.services.whatsapp_ingestion import iter_inbound_images


def test_pipeline_empty_stubs_manual_review() -> None:
    status, signals = collect_screening_outcome(
        extracted=None,
        vision_result={},
        duplicate_ids=[],
    )
    assert status == AnalysisStatus.MANUAL_REVIEW
    assert status != AnalysisStatus.READY_FOR_CONFIRMATION
    assert any(signal.code == "SCREENING_UNAVAILABLE" for signal in signals)


def test_pipeline_reused_txn_is_suspicious() -> None:
    extracted = ExtractedTransaction(transaction_id="ABC-1", amount=100)
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=["prior-analysis"],
    )
    assert status == AnalysisStatus.SUSPICIOUS
    assert any(signal.code == "TXN_REUSED" for signal in signals)


def test_pipeline_real_extraction_without_signals_ready() -> None:
    extracted = ExtractedTransaction(transaction_id="ABC-1", amount=100)
    status, signals = collect_screening_outcome(
        extracted=extracted,
        vision_result={},
        duplicate_ids=[],
    )
    assert status == AnalysisStatus.READY_FOR_CONFIRMATION
    assert signals == []


def test_iter_inbound_images() -> None:
    payload = WhatsAppWebhookPayload(
        object="whatsapp_business_account",
        entry=[
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"display_phone_number": "923001234567"},
                            "messages": [
                                {
                                    "from": "923009999999",
                                    "type": "image",
                                    "image": {"id": "media-1"},
                                }
                            ],
                        }
                    }
                ]
            }
        ],
    )
    images = list(iter_inbound_images(payload))
    assert images == [("923001234567", "media-1", "923009999999")]
