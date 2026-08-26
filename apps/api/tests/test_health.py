"""API tests."""

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


def test_analyses_list_placeholder() -> None:
    response = client.get("/api/v1/analyses")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}
