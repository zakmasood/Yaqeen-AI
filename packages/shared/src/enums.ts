/**
 * Operational analysis outcomes.
 * These are screening results — not proof that funds were received.
 */
export const AnalysisStatus = {
  READY_FOR_CONFIRMATION: "READY_FOR_CONFIRMATION",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  SUSPICIOUS: "SUSPICIOUS",
} as const;

export type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

export const ANALYSIS_STATUSES = Object.values(AnalysisStatus);

export function isAnalysisStatus(value: unknown): value is AnalysisStatus {
  return typeof value === "string" && (ANALYSIS_STATUSES as string[]).includes(value);
}

export const PaymentProvider = {
  EASYPAISA: "EASYPAISA",
  JAZZCASH: "JAZZCASH",
  RAAST: "RAAST",
  BANK_TRANSFER: "BANK_TRANSFER",
  UNKNOWN: "UNKNOWN",
} as const;

export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PAYMENT_PROVIDERS = Object.values(PaymentProvider);

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === "string" && (PAYMENT_PROVIDERS as string[]).includes(value);
}

export const RiskSeverity = {
  INFO: "INFO",
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type RiskSeverity = (typeof RiskSeverity)[keyof typeof RiskSeverity];

/** Required product disclaimer — never claim funds were independently confirmed. */
export const PAYMENT_SCREENING_DISCLAIMER =
  "Payment proof passed screening, but receipt of funds is not independently confirmed.";
