import type { AnalysisStatus, PaymentProvider, RiskSeverity } from "./enums";

/** Fields extracted from a payment-proof screenshot (best-effort OCR/vision). */
export interface ExtractedTransaction {
  provider: PaymentProvider;
  amount: number | null;
  currency: string;
  transactionId: string | null;
  occurredAt: string | null;
  payerHint: string | null;
  payeeHint: string | null;
  rawTextSnippet: string | null;
}

/** A discrete risk indicator — not an authenticity percentage. */
export interface RiskSignal {
  code: string;
  severity: RiskSeverity;
  message: string;
  /** Earlier analysis for this same merchant. Never another merchant's analysis. */
  relatedAnalysisId?: string | null;
}

/** Merchant attestation. Distinct from the screening status. Not provider confirmation. */
export interface MerchantAttestation {
  decision: string;
  note: string | null;
  recordedAt: string;
}

/**
 * Result of payment-proof screening.
 * Status is operational only; disclaimer must always accompany READY_FOR_CONFIRMATION.
 */
export interface AnalysisResult {
  id: string;
  orderId: string | null;
  orderReference: string | null;
  status: AnalysisStatus;
  provider: PaymentProvider;
  extracted: ExtractedTransaction | null;
  signals: RiskSignal[];
  /** Cross-merchant lookup outcome. Null on analyses saved before this check existed. */
  networkCheck: string | null;
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  expectedAmount: number | null;
  expectedCurrency: string | null;
  expectedProvider: PaymentProvider | null;
  expectedPayee: string | null;
  attestation: MerchantAttestation | null;
  screenshotUrl: string | null;
  fileName: string | null;
  reviewedAt: string | null;
  submitterName: string | null;
  submitterPhone: string | null;
}

/** What the merchant expects for a given order before confirming payment. */
export interface PaymentExpectation {
  orderId: string;
  orderReference: string;
  expectedAmount: number;
  currency: string;
  expectedProvider: PaymentProvider | null;
  expectedAccountId: string | null;
}
