import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { AnalysisStatus, PaymentProvider, PAYMENT_SCREENING_DISCLAIMER } from "@yaqeen/shared";

const DEMO: Record<string, { status: AnalysisStatus; provider: PaymentProvider; note: string }> = {
  an_demo_001: {
    status: AnalysisStatus.READY_FOR_CONFIRMATION,
    provider: PaymentProvider.EASYPAISA,
    note: "Placeholder detail view. No extraction or risk engine runs in this scaffold.",
  },
  an_demo_002: {
    status: AnalysisStatus.MANUAL_REVIEW,
    provider: PaymentProvider.JAZZCASH,
    note: "Placeholder detail view. Ambiguous cases will surface here for human review.",
  },
  an_demo_003: {
    status: AnalysisStatus.SUSPICIOUS,
    provider: PaymentProvider.RAAST,
    note: "Placeholder detail view. Suspicious signals will be listed without authenticity scores.",
  },
};

type Props = { params: Promise<{ id: string }> };

export default async function AnalysisDetailPage({ params }: Props) {
  const { id } = await params;
  const row = DEMO[id];
  if (!row) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Analysis</p>
        <h1 className="text-2xl font-bold text-slate-900">{id}</h1>
      </div>
      <Card title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={row.status} />
          <span className="text-sm text-slate-600">{row.provider}</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">{row.note}</p>
      </Card>
      <aside className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {PAYMENT_SCREENING_DISCLAIMER}
      </aside>
    </div>
  );
}
