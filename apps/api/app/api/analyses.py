"""Analyses placeholder router — no fake AI."""

from fastapi import APIRouter, HTTPException, status

from app.schemas import AnalysisCreateRequest, AnalysisListResponse, AnalysisResult

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.get("", response_model=AnalysisListResponse)
def list_analyses() -> AnalysisListResponse:
    # ponytail: empty until persistence + pipeline exist
    return AnalysisListResponse(items=[], total=0)


@router.get("/{analysis_id}", response_model=AnalysisResult)
def get_analysis(analysis_id: str) -> AnalysisResult:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Analysis lookup not implemented yet ({analysis_id})",
    )


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def create_analysis(_body: AnalysisCreateRequest) -> dict[str, str]:
    return {"detail": "Analysis creation not implemented — scaffold only"}
