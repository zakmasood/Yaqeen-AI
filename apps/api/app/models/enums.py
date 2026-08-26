"""Domain enums mirrored from @yaqeen/shared."""

from enum import StrEnum


class AnalysisStatus(StrEnum):
    READY_FOR_CONFIRMATION = "READY_FOR_CONFIRMATION"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    SUSPICIOUS = "SUSPICIOUS"


ANALYSIS_STATUS_VALUES: tuple[str, ...] = tuple(s.value for s in AnalysisStatus)


def is_analysis_status(value: object) -> bool:
    return isinstance(value, str) and value in ANALYSIS_STATUS_VALUES


class PaymentProvider(StrEnum):
    EASYPAISA = "EASYPAISA"
    JAZZCASH = "JAZZCASH"
    RAAST = "RAAST"
    BANK_TRANSFER = "BANK_TRANSFER"
    UNKNOWN = "UNKNOWN"


class RiskSeverity(StrEnum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


PAYMENT_SCREENING_DISCLAIMER = (
    "Payment proof passed screening, but receipt of funds is not independently confirmed."
)
