"""API HTTP tests — health, auth gates, public validation, webhook challenge."""

from fastapi.testclient import TestClient

from app.main import app
from app.models.enums import ANALYSIS_STATUS_VALUES, AnalysisStatus, is_analysis_status

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "yaqeen-api"


def test_analysis_status_validation() -> None:
    assert set(ANALYSIS_STATUS_VALUES) == {
        "READY_FOR_CONFIRMATION",
        "MANUAL_REVIEW",
        "SUSPICIOUS",
    }
    assert is_analysis_status(AnalysisStatus.READY_FOR_CONFIRMATION)
    assert is_analysis_status("MANUAL_REVIEW")
    assert is_analysis_status("SUSPICIOUS")
    assert not is_analysis_status("VERIFIED")
    assert not is_analysis_status("91% authentic")


def test_analyses_list_requires_auth() -> None:
    response = client.get("/api/v1/analyses")
    assert response.status_code == 401


def test_orders_and_accounts_require_auth() -> None:
    assert client.get("/api/v1/orders").status_code == 401
    assert client.get("/api/v1/merchant-accounts").status_code == 401
    assert client.get("/api/v1/me").status_code == 401


def test_invite_path() -> None:
    from app.services.invites import invite_path

    assert invite_path("abc_12") == "/s/abc_12"


def test_invites_require_auth() -> None:
    response = client.post(
        "/api/v1/invites",
        json={"order_reference": "MV-1", "expected_amount": 100},
    )
    assert response.status_code == 401


def test_public_submit_requires_file() -> None:
    response = client.post(
        "/api/v1/public/submissions",
        data={"merchant_slug": "manoversa", "order_reference": "MV-1048"},
    )
    assert response.status_code == 422


def test_cors_origin_list_includes_loopback_twin() -> None:
    from app.core.config import Settings

    origins = Settings(cors_origins="http://localhost:3008").cors_origin_list
    assert origins == ["http://localhost:3008", "http://127.0.0.1:3008"]


def test_whatsapp_challenge_echo_when_token_unset() -> None:
    response = client.get(
        "/api/v1/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "dev",
            "hub.challenge": "12345",
        },
    )
    assert response.status_code == 200
    assert response.text == "12345"
