import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisStatus, PAYMENT_SCREENING_DISCLAIMER } from "@yaqeen/shared";
import { Button } from "@/components/ui/button";
import { InfoBanner } from "@/components/ui/info-banner";
import { QueryMessage } from "@/components/ui/query-message";
import { ReviewButton } from "@/components/analyses/review-button";
import { AttestationForm } from "@/components/analyses/attestation-form";
import { IconAlert, IconCheck, IconClock, IconImage } from "@/components/icons";
import { formatPkr, formatWhen } from "@/lib/format";
import { loadAnalysis } from "@/lib/api-server";
import { ApiError } from "@/lib/api";
import { attestationLabel, evidenceKindLabel, statusNote } from "@/lib/analysis-map";
import { providerLabel } from "@/components/ui/provider-mark";

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
      <div className="mx-auto max-w-6xl px-5 py-14">
        <QueryMessage title="Analysis unavailable">{error}</QueryMessage>
      </div>
    );
  }

  const banner = {
    [AnalysisStatus.SUSPICIOUS]: {
      wrap: "border-danger/30 bg-danger-bg",
      iconWrap: "bg-danger text-white",
      title: "text-danger",
      Icon: IconAlert,
      action: "danger" as const,
      outline: "dangerOutline" as const,
    },
    [AnalysisStatus.MANUAL_REVIEW]: {
      wrap: "border-review/30 bg-review-bg",
      iconWrap: "bg-review text-canvas",
      title: "text-review",
      Icon: IconClock,
      action: "primary" as const,
      outline: "outline" as const,
    },
    [AnalysisStatus.READY_FOR_CONFIRMATION]: {
      wrap: "border-ready/30 bg-ready-bg",
      iconWrap: "bg-ready text-canvas",
      title: "text-ready",
      Icon: IconCheck,
      action: "primary" as const,
      outline: "outline" as const,
    },
  }[row.status];

  const submittedBy = [row.submitterName, row.submitterPhone].filter(Boolean).join(" · ");
  const networkSignal = row.signals.find((signal) => signal.code === "NETWORK_REFERENCE_REUSED");
  const amountNote = amountComparison(row.expectedAmount, row.extracted?.amount ?? null);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-sm text-muted">
        <Link href="/analyses" className="hover:text-accent">
          Inbox
        </Link>
        <span className="break-all"> / {row.orderReference ?? row.id}</span>
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold leading-[0.95] tracking-tight text-ink sm:text-5xl">
        Payment proof analysis
      </h1>

      <section
        className={`mt-5 flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center ${banner.wrap}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${banner.iconWrap}`}
          >
            <banner.Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className={`font-display text-2xl font-semibold ${banner.title}`}>
              {row.status === AnalysisStatus.READY_FOR_CONFIRMATION
                ? "Ready"
                : row.status === AnalysisStatus.MANUAL_REVIEW
                  ? "Needs review"
                  : "Suspicious"}
            </p>
            <p className="text-sm text-ink">{statusNote(row.status)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewButton
            analysisId={row.id}
            variant={banner.action}
            alreadyReviewed={Boolean(row.reviewedAt)}
          />
          <Button href="/analyses" variant={banner.outline}>
            Back to inbox
          </Button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-ink">Submitted proof</h2>
          {row.screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.screenshotUrl}
              alt="Submitted payment proof"
              className="max-h-[420px] w-full rounded-lg border border-line bg-lift object-contain"
            />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-lift text-muted">
              <IconImage className="h-8 w-8" />
              <p className="mt-2 text-sm">No screenshot preview</p>
            </div>
          )}
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Submitted at" value={formatWhen(row.createdAt)} />
            <Row label="Submitted by" value={submittedBy || "None"} />
            <Row label="Source" value={row.source} />
            <Row label="File name" value={row.fileName ?? "None"} />
            {row.reviewedAt ? <Row label="Reviewed at" value={formatWhen(row.reviewedAt)} /> : null}
          </dl>
        </section>

        <div className="space-y-5">
          <NetworkCheckNotice check={row.networkCheck} matchMessage={networkSignal?.message ?? null} />

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-ink">Risk signals</h2>
            {row.signals.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing here blocked the proof. You still confirm the money yourself.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {row.signals.map((signal) => (
                  <li key={signal.code} className="py-3">
                    <p className="text-sm font-medium text-ink">{signal.message}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {evidenceKindLabel(signal.code)} · {signal.code} · {signal.severity}
                    </p>
                    {signal.relatedAnalysisId ? (
                      <Link
                        href={`/analyses/${signal.relatedAnalysisId}`}
                        className="mt-1 inline-block text-sm text-accent hover:underline"
                      >
                        Earlier analysis from this merchant
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-ink">
              Expected vs extracted
            </h2>
            <dl className="space-y-3 text-sm">
              <Compare
                label="Amount"
                expected={row.expectedAmount != null ? formatPkr(row.expectedAmount) : null}
                extracted={row.extracted?.amount != null ? formatPkr(row.extracted.amount) : null}
                note={amountNote}
              />
              <Compare
                label="Currency"
                expected={row.expectedCurrency}
                extracted={row.extracted?.currency || null}
                note={textComparison(row.expectedCurrency, row.extracted?.currency || null)}
              />
              <Compare
                label="Provider"
                expected={row.expectedProvider ? providerLabel(row.expectedProvider) : null}
                extracted={row.extracted ? providerLabel(row.extracted.provider) : null}
                note={textComparison(row.expectedProvider, row.extracted ? row.extracted.provider : null)}
              />
              <Compare
                label="Recipient"
                expected={row.expectedPayee}
                extracted={row.extracted?.payeeHint ?? null}
                note={textComparison(row.expectedPayee, row.extracted?.payeeHint ?? null, true)}
              />
              <Compare
                label="Transaction reference"
                expected={null}
                extracted={row.extracted?.transactionId ?? null}
                note={row.extracted?.transactionId ? "Read from the screenshot" : "Not on the screenshot"}
              />
              <Row label="Order" value={row.orderReference ?? "None"} />
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-1 font-display text-xl font-semibold tracking-tight text-ink">
              Merchant confirmation
            </h2>
            <p className="mb-3 text-sm text-muted">This note does not change the screening result.</p>
            {row.attestation ? (
              <p className="mb-3 break-words text-sm text-ink">
                {attestationLabel(row.attestation.decision)}
                {row.attestation.recordedAt
                  ? ` · ${formatWhen(row.attestation.recordedAt)}`
                  : ""}
                {row.attestation.note ? ` · ${row.attestation.note}` : ""}
              </p>
            ) : (
              <p className="mb-3 text-sm text-muted">No confirmation recorded yet.</p>
            )}
            <AttestationForm analysisId={row.id} currentDecision={row.attestation?.decision ?? null} />
          </section>
        </div>
      </div>

      <InfoBanner className="mt-5">
        {row.status === AnalysisStatus.READY_FOR_CONFIRMATION
          ? `${PAYMENT_SCREENING_DISCLAIMER} `
          : ""}
        Yaqeen reads the amount, currency, provider, recipient, and reference when it can, compares
        them with the order, and notices if that reference was used again at your shop or at another
        Yaqeen merchant. It cannot see whether the provider settled the payment, see another
        merchant&apos;s customer or screenshot, or tell you the image is genuine.
      </InfoBanner>
    </div>
  );
}

function NetworkCheckNotice({
  check,
  matchMessage,
}: {
  check: string | null;
  matchMessage: string | null;
}) {
  if (check === "CHECKED_MATCH") {
    return (
      <section className="rounded-2xl border border-review/40 bg-review-bg p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Seen at another merchant</h2>
        <p className="mt-2 text-sm text-ink">{matchMessage}</p>
        <p className="mt-2 text-xs text-muted">
          You don&apos;t see their name, customer, phone, screenshot, or order.
        </p>
      </section>
    );
  }
  if (check === "UNAVAILABLE") {
    return (
      <section className="rounded-2xl border border-review/40 bg-review-bg p-5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">The other-merchant check did not finish</h2>
        <p className="mt-2 text-sm text-ink">
          No warning here does not mean the reference is unique. The screening result was still saved.
        </p>
      </section>
    );
  }
  if (check === "SKIPPED") {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">The other-merchant check did not run</h2>
        <p className="mt-2 text-sm text-muted">
          The reference was missing, too short, or the provider could not be identified.
        </p>
      </section>
    );
  }
  if (check === "CHECKED_NO_MATCH") {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">No other merchant submitted this reference</h2>
        <p className="mt-2 text-sm text-muted">
          The check finished. This still doesn&apos;t mean you received the payment.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
        This proof has no record of the other-merchant check
      </h2>
      <p className="mt-2 text-sm text-muted">
        It doesn&apos;t say whether another merchant submitted the same reference.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 break-all text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function Compare({
  label,
  expected,
  extracted,
  note,
}: {
  label: string;
  expected: string | null;
  extracted: string | null;
  note: string;
}) {
  const contradiction = note === "Doesn't match";
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-all text-ink">
        <span className="text-muted sm:hidden">Expected </span>
        {expected ?? "Not set"}
      </dd>
      <dd className="col-start-2 min-w-0 break-all text-ink sm:col-auto">
        <span className="text-muted sm:hidden">From proof </span>
        {extracted ?? "Not read"}
      </dd>
      <dd
        className={`col-start-2 text-xs sm:col-auto ${contradiction ? "text-danger" : "text-muted"}`}
      >
        {note}
      </dd>
    </div>
  );
}

function textComparison(expected: string | null, extracted: string | null, loose = false): string {
  const left = expected?.trim() ?? "";
  const right = extracted?.trim() ?? "";
  if (!left && !right) return "Not on the screenshot";
  if (!left) return "You didn't set this";
  if (!right) return "Not on the screenshot";
  if (loose) {
    const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const a = norm(left);
    const b = norm(right);
    if (a && b && (a.includes(b) || b.includes(a))) return "Matches";
    return "Doesn't match";
  }
  return left.toLowerCase() === right.toLowerCase() ? "Matches" : "Doesn't match";
}

function amountComparison(expected: number | null, extracted: number | null): string {
  if (expected == null && extracted == null) return "Not on the screenshot";
  if (expected == null) return "You didn't set this";
  if (extracted == null) return "Not on the screenshot";
  return Math.abs(expected - extracted) <= 0.5 ? "Matches" : "Doesn't match";
}
