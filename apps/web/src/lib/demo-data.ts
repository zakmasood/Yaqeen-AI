import { AnalysisStatus, PaymentProvider } from "@yaqeen/shared";

export type DemoAnalysis = {
  id: string;
  orderReference: string;
  provider: PaymentProvider;
  transactionId: string;
  amountPkr: number;
  expectedAmountPkr: number | null;
  recipient: string;
  analysedAgo: string;
  status: AnalysisStatus;
  note: string;
  submittedAt: string;
  submittedBy: string;
  source: string;
  fileName: string;
  flags: { code: string; label: string; points: number; icon: "reuse" | "amount" | "image" }[];
};

export const DEMO_STATS = {
  ready: 24,
  review: 7,
  suspicious: 3,
};

export const DEMO_ANALYSES: DemoAnalysis[] = [
  {
    id: "an_easypaisa_ready",
    orderReference: "MV-1031",
    provider: PaymentProvider.EASYPAISA,
    transactionId: "2F7X-****-9K3L",
    amountPkr: 12500,
    expectedAmountPkr: 12500,
    recipient: "0300••••567",
    analysedAgo: "2 min ago",
    status: AnalysisStatus.READY_FOR_CONFIRMATION,
    note: "Screening found no blocking signals. Merchant still confirms funds.",
    submittedAt: "12 May 2024, 11:18 AM",
    submittedBy: "Ayesha Malik (0301••••440)",
    source: "WhatsApp",
    fileName: "easypaisa-ready.jpg",
    flags: [],
  },
  {
    id: "an_jazzcash_suspicious",
    orderReference: "MV-1038",
    provider: PaymentProvider.JAZZCASH,
    transactionId: "9A21-****-4H8M",
    amountPkr: 9200,
    expectedAmountPkr: 9200,
    recipient: "0321••••210",
    analysedAgo: "12 min ago",
    status: AnalysisStatus.SUSPICIOUS,
    note: "Payment proof has indicators of tampering.",
    submittedAt: "12 May 2024, 11:08 AM",
    submittedBy: "Usman Ali (0321••••210)",
    source: "WhatsApp",
    fileName: "jazzcash-proof.jpg",
    flags: [
      { code: "IMAGE_INCONSISTENCY", label: "Image inconsistency", points: 40, icon: "image" },
      { code: "TXN_REUSED", label: "Transaction ID reused", points: 32, icon: "reuse" },
    ],
  },
  {
    id: "an_raast_review",
    orderReference: "MV-1040",
    provider: PaymentProvider.RAAST,
    transactionId: "RA-77**-****-12",
    amountPkr: 4500,
    expectedAmountPkr: 4500,
    recipient: "PK•• •••• 4412",
    analysedAgo: "28 min ago",
    status: AnalysisStatus.MANUAL_REVIEW,
    note: "Partial match — reviewer should inspect beneficiary text.",
    submittedAt: "12 May 2024, 10:52 AM",
    submittedBy: "Sara Khan (0333••••901)",
    source: "Web upload",
    fileName: "raast-transfer.jpg",
    flags: [
      { code: "PAYEE_AMBIGUOUS", label: "Beneficiary text unclear", points: 18, icon: "amount" },
    ],
  },
  {
    id: "an_bank_review",
    orderReference: "MV-1044",
    provider: PaymentProvider.BANK_TRANSFER,
    transactionId: "FT-18**-****-44",
    amountPkr: 18400,
    expectedAmountPkr: 18400,
    recipient: "PK•• •••• 8821",
    analysedAgo: "1 hour ago",
    status: AnalysisStatus.MANUAL_REVIEW,
    note: "Unable to match beneficiary details.",
    submittedAt: "12 May 2024, 10:20 AM",
    submittedBy: "Bilal Ahmed (0345••••123)",
    source: "Web upload",
    fileName: "bank-transfer.jpg",
    flags: [
      {
        code: "PAYEE_MISMATCH",
        label: "Unable to match beneficiary details",
        points: 22,
        icon: "amount",
      },
    ],
  },
  {
    id: "MV-1048",
    orderReference: "MV-1048",
    provider: PaymentProvider.EASYPAISA,
    transactionId: "EP-8K72-19Q",
    amountPkr: 2500,
    expectedAmountPkr: 5000,
    recipient: "0300••••567",
    analysedAgo: "1 hour ago",
    status: AnalysisStatus.SUSPICIOUS,
    note: "Hold fulfilment and review this proof.",
    submittedAt: "12 May 2024, 11:25 AM",
    submittedBy: "Muhammad Ahmed (0345••••123)",
    source: "Web upload",
    fileName: "IMG_20240512_1124.jpg",
    flags: [
      { code: "TXN_REUSED", label: "Transaction ID reused", points: 35, icon: "reuse" },
      { code: "AMOUNT_MISMATCH", label: "Amount does not match", points: 25, icon: "amount" },
      {
        code: "NEAR_DUPLICATE_IMAGE",
        label: "Near-identical image found",
        points: 12,
        icon: "image",
      },
    ],
  },
];

export const ATTENTION_IDS = ["an_jazzcash_suspicious", "an_bank_review"];

export function getAnalysis(id: string): DemoAnalysis | undefined {
  return DEMO_ANALYSES.find((row) => row.id === id || row.orderReference === id);
}

export function formatPkr(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export function riskTotal(row: DemoAnalysis): number {
  return row.flags.reduce((sum, flag) => sum + flag.points, 0);
}
