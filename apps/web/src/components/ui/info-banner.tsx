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
    warning: "border-amber-100 bg-amber-50 text-amber-900",
    success: "border-yaqeen-100 bg-yaqeen-50 text-yaqeen-900",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
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
