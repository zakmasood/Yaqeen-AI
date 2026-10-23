import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { QueryMessage } from "@/components/ui/query-message";
import { AnalysisTable } from "@/components/analyses/analysis-table";
import { IconChevronRight } from "@/components/icons";
import { loadAnalyses } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { statusNote } from "@/lib/analysis-map";
import { formatAgo, formatPkr } from "@/lib/format";
import { AnalysisStatus } from "@yaqeen/shared";
import type { AnalysisResult } from "@yaqeen/shared";
import Link from "next/link";

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
      hint: "Passed screening. You still confirm the transfer.",
      valueClass: "text-ready",
    },
    {
      label: "Needs review",
      value: stats.review,
      hint: "Something is missing or unclear. Look before you decide.",
      valueClass: "text-review",
    },
    {
      label: "Suspicious",
      value: stats.suspicious,
      hint: "A repeated reference or a proof that does not line up.",
      valueClass: "text-danger",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <PageHeader
        kicker="Desk"
        title="Overview"
        lede="Proofs waiting on you. Ready still means you confirm the money arrived."
        actions={
          <>
            <Button href="/settings">Ask for a screenshot</Button>
            <Button href="/upload" variant="outline">
              Upload myself
            </Button>
          </>
        }
      />

      {error ? (
        <QueryMessage title="Analyses unavailable">{error}</QueryMessage>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {statCards.map((card) => {
              return (
                <div key={card.label} className="rounded-2xl border border-line bg-surface p-6">
                  <p className={`font-display text-2xl font-semibold ${card.valueClass}`}>{card.label}</p>
                  <p className="mt-4 font-display text-5xl font-semibold tracking-tight text-ink">
                    {card.value}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{card.hint}</p>
                </div>
              );
            })}
          </section>

          {attention.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight text-ink">Needs attention</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {attention.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/analyses/${row.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-lift"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={row.status} />
                          <span className="text-sm font-medium text-ink">
                            {row.extracted?.amount != null
                              ? formatPkr(row.extracted.amount)
                              : "Amount unknown"}
                          </span>
                          <span className="text-sm text-muted">{formatAgo(row.createdAt)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted">
                          {row.signals.find((signal) => signal.code === "NETWORK_REFERENCE_REUSED")
                            ?.message ??
                            row.signals[0]?.message ??
                            statusNote(row.status)}
                        </p>
                      </div>
                      <IconChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight text-ink">Recent analyses</h2>
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
                    className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
                  >
                    View inbox
                    <IconChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
