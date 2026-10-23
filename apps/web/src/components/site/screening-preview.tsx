import { StatusBadge } from "@/components/ui/badge";
import { AnalysisStatus } from "@yaqeen/shared";

const rows = [
  { label: "Order", value: "MV-1048" },
  { label: "Provider", value: "Easypaisa" },
  { label: "Amount on proof", value: "PKR 5,000" },
  { label: "Expected", value: "PKR 5,000" },
];

export function ScreeningPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="ml-2 font-display text-sm font-medium text-ink">ManoVersa</span>
        </div>
        <span className="rounded-full bg-lift px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted">
          Sample
        </span>
      </div>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Payment proof</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">PKR 5,000</p>
          </div>
          <StatusBadge status={AnalysisStatus.READY_FOR_CONFIRMATION} />
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl bg-lift px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-wider text-muted">{row.label}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-ink">
            <span data-pulse className="h-1.5 w-1.5 rounded-full bg-ready" />
            Amount matches the order
          </li>
          <li className="flex items-center gap-2 text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-ready" />
            Reference not seen at another merchant
          </li>
        </ul>
        <p className="border-t border-line pt-3 text-xs leading-relaxed text-muted">
          Screening passed. Receipt of funds is not confirmed. That stays with the shop.
        </p>
      </div>
    </div>
  );
}
