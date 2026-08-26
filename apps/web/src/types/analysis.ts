import type { AnalysisResult } from "@yaqeen/shared";

/** Re-export shared domain types for feature modules. */
export type { AnalysisResult, AnalysisStatus, PaymentProvider } from "@yaqeen/shared";

export type AnalysisListItem = Pick<
  AnalysisResult,
  "id" | "status" | "provider" | "createdAt" | "orderId"
>;
