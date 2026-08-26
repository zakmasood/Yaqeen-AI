import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { AnalysisStatus, PaymentProvider } from "@yaqeen/shared";

/** Placeholder rows — no fake fraud scores. Replace with API data later. */
const PLACEHOLDER = [
  {
    id: "an_demo_001",
    status: AnalysisStatus.READY_FOR_CONFIRMATION,
    provider: PaymentProvider.EASYPAISA,
    createdAt: "—",
  },
  {
    id: "an_demo_002",
    status: AnalysisStatus.MANUAL_REVIEW,
    provider: PaymentProvider.JAZZCASH,
    createdAt: "—",
  },
  {
    id: "an_demo_003",
    status: AnalysisStatus.SUSPICIOUS,
    provider: PaymentProvider.RAAST,
    createdAt: "—",
  },
] as const;

export default function AnalysesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analyses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Screening outcomes for submitted payment proofs. Placeholder list until the API is wired.
        </p>
      </div>
      <div className="grid gap-3">
        {PLACEHOLDER.map((row) => (
          <Card
            key={row.id}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link
                href={`/analyses/${row.id}`}
                className="font-medium text-yaqeen-700 hover:underline"
              >
                {row.id}
              </Link>
              <p className="text-xs text-slate-500">
                {row.provider} · {row.createdAt}
              </p>
            </div>
            <StatusBadge status={row.status} />
          </Card>
        ))}
      </div>
    </div>
  );
}
