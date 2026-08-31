import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisStatus } from "@yaqeen/shared";
import { Button } from "@/components/ui/button";
import { InfoBanner } from "@/components/ui/info-banner";
import { PhoneReceipt } from "@/components/proof/phone-receipt";
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconImage,
  IconRefresh,
  IconWallet,
} from "@/components/icons";
import { formatPkr, getAnalysis, riskTotal } from "@/lib/demo-data";
import { providerLabel } from "@/components/ui/provider-mark";

const flagIcons = {
  reuse: IconRefresh,
  amount: IconWallet,
  image: IconImage,
};

type Props = { params: Promise<{ id: string }> };

export default async function AnalysisDetailPage({ params }: Props) {
  const { id } = await params;
  const row = getAnalysis(id);
  if (!row) notFound();

  const total = riskTotal(row);
  const banner = {
    [AnalysisStatus.SUSPICIOUS]: {
      wrap: "border-red-200 bg-red-50",
      iconWrap: "bg-red-600 text-white",
      title: "text-red-700",
      Icon: IconAlert,
      action: "danger" as const,
      outline: "dangerOutline" as const,
    },
    [AnalysisStatus.MANUAL_REVIEW]: {
      wrap: "border-amber-200 bg-amber-50",
      iconWrap: "bg-amber-500 text-white",
      title: "text-amber-800",
      Icon: IconClock,
      action: "primary" as const,
      outline: "outline" as const,
    },
    [AnalysisStatus.READY_FOR_CONFIRMATION]: {
      wrap: "border-emerald-200 bg-emerald-50",
      iconWrap: "bg-emerald-600 text-white",
      title: "text-emerald-800",
      Icon: IconCheck,
      action: "primary" as const,
      outline: "outline" as const,
    },
  }[row.status];

  return (
    <div className="px-6 py-8 lg:px-10">
      <p className="text-sm text-slate-400">
        <Link href="/analyses" className="hover:text-yaqeen-700">
          Analyses
        </Link>
        <span> / {row.orderReference}</span>
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        Payment proof analysis
      </h1>

      <section
        className={`mt-5 flex flex-col gap-4 rounded-xl border px-5 py-4 sm:flex-row sm:items-center ${banner.wrap}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${banner.iconWrap}`}
          >
            <banner.Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className={`text-lg font-bold ${banner.title}`}>
                {row.status === AnalysisStatus.READY_FOR_CONFIRMATION
                  ? "Ready"
                  : row.status === AnalysisStatus.MANUAL_REVIEW
                    ? "Needs review"
                    : "Suspicious"}
              </p>
              {total > 0 ? (
                <p className={`text-lg font-bold ${banner.title}`}>{total} / 100</p>
              ) : null}
            </div>
            <p className="text-sm text-slate-700">{row.note}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={banner.action}>Mark reviewed</Button>
          <Button href="/analyses" variant={banner.outline}>
            Back to analyses
          </Button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Submitted proof</h2>
          <PhoneReceipt />
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Submitted at" value={row.submittedAt} />
            <Row label="Submitted by" value={row.submittedBy} />
            <Row label="Source" value={row.source} />
            <Row label="File name" value={row.fileName} />
          </dl>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Why this was flagged</h2>
            {row.flags.length === 0 ? (
              <p className="text-sm text-slate-500">
                No blocking signals in this placeholder. Merchant confirmation is still required.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {row.flags.map((flag) => {
                  const Icon = flagIcons[flag.icon];
                  return (
                    <li key={flag.code} className="flex items-center gap-3 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium text-slate-800">
                        {flag.label}
                      </span>
                      <span className="text-sm font-semibold text-red-600">+{flag.points}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Extracted details</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Provider" value={providerLabel(row.provider)} />
              <Row label="Amount" value={formatPkr(row.amountPkr)} />
              {row.expectedAmountPkr != null ? (
                <Row
                  label="Expected"
                  value={formatPkr(row.expectedAmountPkr)}
                  emphasize={row.expectedAmountPkr !== row.amountPkr}
                />
              ) : null}
              <Row label="Recipient" value={row.recipient} />
              <Row label="Transaction ID" value={row.transactionId} />
            </dl>
          </section>
        </div>
      </div>

      <InfoBanner className="mt-5">
        Yaqeen assesses risk indicators. It does not confirm bank settlement.
      </InfoBanner>
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={emphasize ? "font-semibold text-red-600" : "font-medium text-slate-800"}>
        {value}
      </dd>
    </div>
  );
}
