import type { AnalysisResult, ExtractedTransaction, RiskSignal } from "@yaqeen/shared";
import { AnalysisStatus, PaymentProvider, RiskSeverity } from "@yaqeen/shared";

type ApiExtracted = {
  provider?: string;
  amount?: number | null;
  currency?: string | null;
  transaction_id?: string | null;
  occurred_at?: string | null;
  payer_hint?: string | null;
  payee_hint?: string | null;
  raw_text_snippet?: string | null;
};

type ApiSignal = {
  code?: string;
  severity?: string;
  message?: string;
};

export type ApiAnalysis = {
  id: string;
  order_id?: string | null;
  order_reference?: string | null;
  status: string;
  provider?: string;
  extracted?: ApiExtracted | null;
  signals?: ApiSignal[];
  disclaimer?: string;
  created_at: string;
  updated_at: string;
  source?: string;
  expected_amount?: number | null;
  screenshot_url?: string | null;
  file_name?: string | null;
  reviewed_at?: string | null;
  submitter_name?: string | null;
  submitter_phone?: string | null;
};

function asStatus(value: string): AnalysisStatus {
  if (value === AnalysisStatus.READY_FOR_CONFIRMATION) return value;
  if (value === AnalysisStatus.MANUAL_REVIEW) return value;
  if (value === AnalysisStatus.SUSPICIOUS) return value;
  return AnalysisStatus.MANUAL_REVIEW;
}

function asProvider(value: string | undefined): PaymentProvider {
  if (value && (Object.values(PaymentProvider) as string[]).includes(value)) {
    return value as PaymentProvider;
  }
  return PaymentProvider.UNKNOWN;
}

function asSeverity(value: string | undefined): RiskSeverity {
  if (value && (Object.values(RiskSeverity) as string[]).includes(value)) {
    return value as RiskSeverity;
  }
  return RiskSeverity.INFO;
}

function mapExtracted(row: ApiExtracted | null | undefined): ExtractedTransaction | null {
  if (!row) return null;
  return {
    provider: asProvider(row.provider),
    amount: row.amount ?? null,
    currency: row.currency ?? "PKR",
    transactionId: row.transaction_id ?? null,
    occurredAt: row.occurred_at ?? null,
    payerHint: row.payer_hint ?? null,
    payeeHint: row.payee_hint ?? null,
    rawTextSnippet: row.raw_text_snippet ?? null,
  };
}

function mapSignals(rows: ApiSignal[] | undefined): RiskSignal[] {
  return (rows ?? []).map((row) => ({
    code: row.code ?? "",
    severity: asSeverity(row.severity),
    message: row.message ?? "",
  }));
}

export function mapAnalysis(row: ApiAnalysis): AnalysisResult {
  return {
    id: row.id,
    orderId: row.order_id ?? null,
    orderReference: row.order_reference ?? null,
    status: asStatus(row.status),
    provider: asProvider(row.provider),
    extracted: mapExtracted(row.extracted),
    signals: mapSignals(row.signals),
    disclaimer:
      row.disclaimer ??
      "Payment proof passed screening, but receipt of funds is not independently confirmed.",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source ?? "upload",
    expectedAmount: row.expected_amount ?? null,
    screenshotUrl: row.screenshot_url ?? null,
    fileName: row.file_name ?? null,
    reviewedAt: row.reviewed_at ?? null,
    submitterName: row.submitter_name ?? null,
    submitterPhone: row.submitter_phone ?? null,
  };
}

export function statusNote(status: AnalysisStatus): string {
  if (status === AnalysisStatus.READY_FOR_CONFIRMATION) {
    return "Screening found no blocking signals. Merchant still confirms funds.";
  }
  if (status === AnalysisStatus.SUSPICIOUS) {
    return "Hold fulfilment and review this proof.";
  }
  return "Human review required.";
}
