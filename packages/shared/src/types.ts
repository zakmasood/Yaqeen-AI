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

/** A discrete risk indicator — not a authenticity percentage. */
export interface RiskSignal {
  code: string;
  severity: RiskSeverity;
  message: string;
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
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  expectedAmount: number | null;
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
