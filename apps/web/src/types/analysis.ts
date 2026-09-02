import type { AnalysisResult } from "@yaqeen/shared";

export type { AnalysisResult, AnalysisStatus, PaymentProvider } from "@yaqeen/shared";

export type AnalysisListItem = Pick<
  AnalysisResult,
  "id" | "status" | "provider" | "createdAt" | "orderId" | "orderReference"
>;
