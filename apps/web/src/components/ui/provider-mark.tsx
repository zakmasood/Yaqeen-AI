import clsx from "clsx";
import { PaymentProvider } from "@yaqeen/shared";

const labels: Record<PaymentProvider, string> = {
  EASYPAISA: "Easypaisa",
  JAZZCASH: "JazzCash",
  RAAST: "Raast",
  BANK_TRANSFER: "Bank transfer",
  UNKNOWN: "Unknown",
};

const tones: Record<PaymentProvider, string> = {
  EASYPAISA: "bg-emerald-600",
  JAZZCASH: "bg-red-500",
  RAAST: "bg-sky-600",
  BANK_TRANSFER: "bg-slate-700",
  UNKNOWN: "bg-slate-400",
};

const initials: Record<PaymentProvider, string> = {
  EASYPAISA: "EP",
  JAZZCASH: "JC",
  RAAST: "R",
  BANK_TRANSFER: "B",
  UNKNOWN: "?",
};

export function providerLabel(provider: PaymentProvider): string {
  return labels[provider];
}

export function ProviderMark({
  provider,
  showLabel = true,
}: {
  provider: PaymentProvider;
  showLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white",
          tones[provider],
        )}
      >
        {initials[provider]}
      </span>
      {showLabel ? (
        <span className="text-sm font-medium text-slate-800">{labels[provider]}</span>
      ) : null}
    </span>
  );
}
