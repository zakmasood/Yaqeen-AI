import Link from "next/link";
import type { AnalysisResult } from "@yaqeen/shared";
import { StatusBadge } from "@/components/ui/badge";
import { ProviderMark } from "@/components/ui/provider-mark";
import { IconChevronRight } from "@/components/icons";
import { formatAgo, formatPkr } from "@/lib/format";

export function AnalysisTable({
  rows,
  showOrder = true,
}: {
  rows: AnalysisResult[];
  showOrder?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
          <tr>
            {showOrder ? <th className="px-4 py-3">Order</th> : null}
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
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {showOrder ? (
                <td className="px-4 py-3 font-medium text-slate-800">
                  <Link href={`/analyses/${row.id}`} className="hover:text-yaqeen-700">
                    {row.orderReference ?? "—"}
                  </Link>
                </td>
              ) : null}
              <td className="px-4 py-3">
                <Link href={`/analyses/${row.id}`} className="block">
                  <ProviderMark provider={row.provider} />
                </Link>
              </td>
              <td className="hidden px-4 py-3 font-mono text-xs text-slate-600 md:table-cell">
                {row.extracted?.transactionId ?? "—"}
              </td>
              <td className="px-4 py-3 font-medium text-slate-800">
                {row.extracted?.amount != null ? formatPkr(row.extracted.amount) : "—"}
              </td>
              <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                {formatAgo(row.createdAt)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-2 py-3 text-slate-300">
                <Link
                  href={`/analyses/${row.id}`}
                  aria-label={`Open ${row.orderReference ?? row.id}`}
                >
                  <IconChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
