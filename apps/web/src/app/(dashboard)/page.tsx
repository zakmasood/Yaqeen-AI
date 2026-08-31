import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ProviderMark } from "@/components/ui/provider-mark";
import {
  IconAlert,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconSearchDoc,
} from "@/components/icons";
import { ATTENTION_IDS, DEMO_ANALYSES, DEMO_STATS, formatPkr, getAnalysis } from "@/lib/demo-data";
import { AnalysisStatus } from "@yaqeen/shared";

const statCards = [
  {
    label: "Ready",
    value: DEMO_STATS.ready,
    hint: "Ready for confirmation",
    icon: IconCheck,
    iconWrap: "bg-emerald-50 text-emerald-700",
    valueClass: "text-emerald-700",
  },
  {
    label: "Needs review",
    value: DEMO_STATS.review,
    hint: "Awaiting review",
    icon: IconClock,
    iconWrap: "bg-amber-50 text-amber-700",
    valueClass: "text-amber-600",
  },
  {
    label: "Suspicious",
    value: DEMO_STATS.suspicious,
    hint: "Potential risk detected",
    icon: IconAlert,
    iconWrap: "bg-red-50 text-red-600",
    valueClass: "text-red-600",
  },
];

export default function OverviewPage() {
  const attention = ATTENTION_IDS.map((id) => getAnalysis(id)).filter(Boolean);

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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="hidden px-4 py-3 md:table-cell">Transaction ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Analysed</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="w-8 px-2 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ANALYSES.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/analyses/${row.id}`} className="block">
                        <ProviderMark provider={row.provider} />
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-slate-600 md:table-cell">
                      {row.transactionId}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatPkr(row.amountPkr)}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                      {row.analysedAgo}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-2 py-3 text-slate-300">
                      <Link href={`/analyses/${row.id}`} aria-label={`Open ${row.orderReference}`}>
                        <IconChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 py-3 text-center">
              <Link
                href="/analyses"
                className="inline-flex items-center gap-1 text-sm font-semibold text-yaqeen-700 hover:underline"
              >
                View all analyses
                <IconChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <aside className="w-full shrink-0 border-t border-slate-200 bg-white px-5 py-8 lg:w-[300px] lg:border-l lg:border-t-0">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Needs attention</h2>
        <div className="space-y-4">
          {attention.map((row) =>
            row ? (
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
                <p className="font-mono text-xs text-slate-500">{row.transactionId}</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatPkr(row.amountPkr)} · {row.analysedAgo}
                </p>
                <p className="mt-2 text-sm text-slate-600">{row.note}</p>
                <Link
                  href={`/analyses/${row.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-yaqeen-700 hover:underline"
                >
                  Review case
                  <IconChevronRight className="h-4 w-4" />
                </Link>
              </article>
            ) : null,
          )}
        </div>
      </aside>
    </div>
  );
}
