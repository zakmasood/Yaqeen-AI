import clsx from "clsx";
import { AnalysisStatus } from "@yaqeen/shared";

const labels: Record<AnalysisStatus, string> = {
  READY_FOR_CONFIRMATION: "Ready",
  MANUAL_REVIEW: "Needs review",
  SUSPICIOUS: "Suspicious",
};

const styles: Record<AnalysisStatus, string> = {
  READY_FOR_CONFIRMATION: "bg-ready-bg text-ready ring-ready/30",
  MANUAL_REVIEW: "bg-review-bg text-review ring-review/30",
  SUSPICIOUS: "bg-danger-bg text-danger ring-danger/30",
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
    neutral: "bg-lift text-muted ring-line",
    success: "bg-ready-bg text-ready ring-ready/30",
    warning: "bg-review-bg text-review ring-review/30",
    danger: "bg-danger-bg text-danger ring-danger/30",
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
