import clsx from "clsx";
import { IconInfo } from "@/components/icons";

export function InfoBanner({
  children,
  tone = "warning",
  className,
}: {
  children: React.ReactNode;
  tone?: "warning" | "success" | "neutral";
  className?: string;
}) {
  const tones = {
    warning: "border-review/30 bg-review-bg text-review",
    success: "border-yaqeen-700/40 bg-ready-bg text-ready",
    neutral: "border-line bg-lift text-muted",
  };

  return (
    <aside
      className={clsx(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
    >
      <IconInfo className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </aside>
  );
}
