import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { ProviderMark } from "@/components/ui/provider-mark";
import { IconChevronRight } from "@/components/icons";
import { DEMO_ANALYSES, formatPkr } from "@/lib/demo-data";

export default function AnalysesPage() {
  return (
    <div className="px-6 py-8 lg:px-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Analyses</h1>
      <p className="mb-6 text-sm text-slate-500">
        Placeholder list for UI development. Screening statuses are operational — not fund
        confirmation.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Provider</th>
              <th className="hidden px-4 py-3 md:table-cell">Transaction ID</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="w-8 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {DEMO_ANALYSES.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-800">
                  <Link href={`/analyses/${row.id}`} className="hover:text-yaqeen-700">
                    {row.orderReference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <ProviderMark provider={row.provider} />
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs text-slate-600 md:table-cell">
                  {row.transactionId}
                </td>
                <td className="px-4 py-3">{formatPkr(row.amountPkr)}</td>
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
      </div>
    </div>
  );
}
