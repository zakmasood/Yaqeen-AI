import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisStatus } from "@yaqeen/shared";
import { Button } from "@/components/ui/button";
import { InfoBanner } from "@/components/ui/info-banner";
import { QueryMessage } from "@/components/ui/query-message";
import { ReviewButton } from "@/components/analyses/review-button";
import { IconAlert, IconCheck, IconClock, IconImage } from "@/components/icons";
import { formatPkr, formatWhen } from "@/lib/format";
import { loadAnalysis } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { statusNote } from "@/lib/analysis-map";
import { providerLabel } from "@/components/ui/provider-mark";
import { PAYMENT_SCREENING_DISCLAIMER } from "@yaqeen/shared";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AnalysisDetailPage({ params }: Props) {
  const { id } = await params;
  let error: string | null = null;
  let row = null;
  try {
    row = await loadAnalysis(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    error = err instanceof ApiError ? err.message : "Could not load analysis";
  }

  if (error || !row) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <QueryMessage title="Analysis unavailable">{error}</QueryMessage>
      </div>
    );
  }

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

  const submittedBy = [row.submitterName, row.submitterPhone].filter(Boolean).join(" · ");

  return (
    <div className="px-6 py-8 lg:px-10">
      <p className="text-sm text-slate-400">
        <Link href="/analyses" className="hover:text-yaqeen-700">
          Analyses
        </Link>
        <span> / {row.orderReference ?? row.id}</span>
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
            <p className={`text-lg font-bold ${banner.title}`}>
              {row.status === AnalysisStatus.READY_FOR_CONFIRMATION
                ? "Ready"
                : row.status === AnalysisStatus.MANUAL_REVIEW
                  ? "Needs review"
                  : "Suspicious"}
            </p>
            <p className="text-sm text-slate-700">{statusNote(row.status)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewButton
            analysisId={row.id}
            variant={banner.action}
            alreadyReviewed={Boolean(row.reviewedAt)}
          />
          <Button href="/analyses" variant={banner.outline}>
            Back to analyses
          </Button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Submitted proof</h2>
          {row.screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.screenshotUrl}
              alt="Submitted payment proof"
              className="max-h-[420px] w-full rounded-lg border border-slate-100 object-contain bg-slate-50"
            />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500">
              <IconImage className="h-8 w-8" />
              <p className="mt-2 text-sm">No screenshot preview</p>
            </div>
          )}
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Submitted at" value={formatWhen(row.createdAt)} />
            <Row label="Submitted by" value={submittedBy || "—"} />
            <Row label="Source" value={row.source} />
            <Row label="File name" value={row.fileName ?? "—"} />
            {row.reviewedAt ? <Row label="Reviewed at" value={formatWhen(row.reviewedAt)} /> : null}
          </dl>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Risk signals</h2>
            {row.signals.length === 0 ? (
              <p className="text-sm text-slate-500">
                No blocking signals. Merchant confirmation is still required.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {row.signals.map((signal) => (
                  <li key={signal.code} className="py-3">
                    <p className="text-sm font-medium text-slate-800">{signal.message}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {signal.code} · {signal.severity}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Extracted details</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Provider" value={providerLabel(row.provider)} />
              <Row
                label="Amount"
                value={
                  row.extracted?.amount != null ? formatPkr(row.extracted.amount) : "Not extracted"
                }
              />
              {row.expectedAmount != null ? (
                <Row
                  label="Expected"
                  value={formatPkr(row.expectedAmount)}
                  emphasize={
                    row.extracted?.amount != null && row.extracted.amount !== row.expectedAmount
                  }
                />
              ) : null}
              <Row label="Recipient" value={row.extracted?.payeeHint ?? "—"} />
              <Row label="Transaction ID" value={row.extracted?.transactionId ?? "—"} />
              <Row label="Order" value={row.orderReference ?? "—"} />
            </dl>
          </section>
        </div>
      </div>

      <InfoBanner className="mt-5">
        {row.status === AnalysisStatus.READY_FOR_CONFIRMATION
          ? PAYMENT_SCREENING_DISCLAIMER
          : "Yaqeen assesses risk indicators. It does not confirm bank settlement."}
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
