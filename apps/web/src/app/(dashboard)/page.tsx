import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ProviderMark } from "@/components/ui/provider-mark";
import { QueryMessage } from "@/components/ui/query-message";
import { AnalysisTable } from "@/components/analyses/analysis-table";
import {
  IconAlert,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconSearchDoc,
} from "@/components/icons";
import { loadAnalyses } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { statusNote } from "@/lib/analysis-map";
import { formatAgo, formatPkr } from "@/lib/format";
import { AnalysisStatus } from "@yaqeen/shared";
import type { AnalysisResult } from "@yaqeen/shared";

export const dynamic = "force-dynamic";

function countByStatus(rows: AnalysisResult[]) {
  return {
    ready: rows.filter((row) => row.status === AnalysisStatus.READY_FOR_CONFIRMATION).length,
    review: rows.filter((row) => row.status === AnalysisStatus.MANUAL_REVIEW).length,
    suspicious: rows.filter((row) => row.status === AnalysisStatus.SUSPICIOUS).length,
  };
}

export default async function OverviewPage() {
  let rows: AnalysisResult[] = [];
  let error: string | null = null;
  try {
    rows = await loadAnalyses();
  } catch (err) {
    error = err instanceof ApiError ? err.message : "Could not load analyses";
  }

  const stats = countByStatus(rows);
  const attention = rows
    .filter(
      (row) =>
        row.status === AnalysisStatus.MANUAL_REVIEW || row.status === AnalysisStatus.SUSPICIOUS,
    )
    .slice(0, 5);
  const recent = rows.slice(0, 8);

  const statCards = [
    {
      label: "Ready",
      value: stats.ready,
      hint: "Ready for confirmation",
      icon: IconCheck,
      iconWrap: "bg-emerald-50 text-emerald-700",
      valueClass: "text-emerald-700",
    },
    {
      label: "Needs review",
      value: stats.review,
      hint: "Awaiting review",
      icon: IconClock,
      iconWrap: "bg-amber-50 text-amber-700",
      valueClass: "text-amber-600",
    },
    {
      label: "Suspicious",
      value: stats.suspicious,
      hint: "Potential risk detected",
      icon: IconAlert,
      iconWrap: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
    },
  ];

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <div className="min-w-0 flex-1 px-6 py-8 lg:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h1>
          <Button href="/upload">
            <IconSearchDoc className="h-4 w-4" />
            Analyse payment proof
          </Button>
        </div>

        {error ? (
          <QueryMessage title="Analyses unavailable">{error}</QueryMessage>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${card.iconWrap}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {card.label}
                    </div>
                    <p className={`mt-3 text-4xl font-bold ${card.valueClass}`}>{card.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{card.hint}</p>
                  </div>
                );
              })}
            </section>

            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent analyses</h2>
              {recent.length === 0 ? (
                <QueryMessage title="No analyses yet">
                  Upload a payment proof or share the customer submit link.
                </QueryMessage>
              ) : (
                <>
                  <AnalysisTable rows={recent} showOrder={false} />
                  <div className="mt-3 text-center">
                    <Link
                      href="/analyses"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-yaqeen-700 hover:underline"
                    >
                      View all analyses
                      <IconChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <aside className="w-full shrink-0 border-t border-slate-200 bg-white px-5 py-8 lg:w-[300px] lg:border-l lg:border-t-0">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing waiting for review.</p>
        ) : (
          <div className="space-y-4">
            {attention.map((row) => (
              <article
                key={row.id}
                className={
                  row.status === AnalysisStatus.SUSPICIOUS
                    ? "rounded-xl border border-slate-200 border-l-4 border-l-red-500 bg-white p-4 shadow-card"
                    : "rounded-xl border border-slate-200 border-l-4 border-l-amber-400 bg-white p-4 shadow-card"
                }
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <ProviderMark provider={row.provider} />
                  <StatusBadge status={row.status} />
                </div>
                <p className="font-mono text-xs text-slate-500">
                  {row.extracted?.transactionId ?? row.orderReference ?? row.id}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {row.extracted?.amount != null
                    ? formatPkr(row.extracted.amount)
                    : "Amount unknown"}{" "}
                  · {formatAgo(row.createdAt)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {row.signals[0]?.message ?? statusNote(row.status)}
                </p>
                <Link
                  href={`/analyses/${row.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-yaqeen-700 hover:underline"
                >
                  Review case
                  <IconChevronRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
