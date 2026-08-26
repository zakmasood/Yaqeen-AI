import clsx from "clsx";
import { AnalysisStatus } from "@yaqeen/shared";

const labels: Record<AnalysisStatus, string> = {
  READY_FOR_CONFIRMATION: "Ready for confirmation",
  MANUAL_REVIEW: "Manual review",
  SUSPICIOUS: "Suspicious",
};

const styles: Record<AnalysisStatus, string> = {
  READY_FOR_CONFIRMATION: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  MANUAL_REVIEW: "bg-amber-100 text-amber-900 ring-amber-200",
  SUSPICIOUS: "bg-red-100 text-red-800 ring-red-200",
};

export function StatusBadge({ status }: { status: AnalysisStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    warning: "bg-amber-100 text-amber-900 ring-amber-200",
    danger: "bg-red-100 text-red-800 ring-red-200",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}
