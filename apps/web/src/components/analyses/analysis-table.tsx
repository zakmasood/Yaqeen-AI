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
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
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
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-lift">
              {showOrder ? (
                <td className="max-w-[12rem] px-4 py-3 font-medium text-ink">
                  <Link href={`/analyses/${row.id}`} className="block truncate hover:text-accent">
                    {row.orderReference ?? "None"}
                  </Link>
                </td>
              ) : null}
              <td className="px-4 py-3">
                <Link href={`/analyses/${row.id}`} className="block">
                  <ProviderMark provider={row.provider} />
                </Link>
              </td>
              <td className="hidden max-w-[10rem] px-4 py-3 font-mono text-xs text-muted md:table-cell">
                <span className="block truncate">{row.extracted?.transactionId ?? "None"}</span>
              </td>
              <td className="px-4 py-3 font-medium text-ink">
                {row.extracted?.amount != null ? formatPkr(row.extracted.amount) : "None"}
              </td>
              <td className="hidden px-4 py-3 text-muted lg:table-cell">
                {formatAgo(row.createdAt)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
                {row.signals.some((signal) => signal.code === "NETWORK_REFERENCE_REUSED") ? (
                  <p className="mt-1 text-xs text-review">Seen at another merchant</p>
                ) : null}
              </td>
              <td className="px-2 py-3 text-muted">
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
