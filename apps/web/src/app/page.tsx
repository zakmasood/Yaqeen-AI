import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { AnalysisStatus, PAYMENT_SCREENING_DISCLAIMER } from "@yaqeen/shared";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-yaqeen-700 to-yaqeen-900 px-6 py-10 text-white shadow-lg sm:px-10">
        <p className="text-sm font-medium uppercase tracking-wide text-yaqeen-100">Yaqeen AI</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Payment-proof screening for Pakistani merchants
        </h1>
        <p className="mt-4 max-w-2xl text-yaqeen-50">
          Review Easypaisa, JazzCash, Raast, and bank transfer screenshots from WhatsApp. Detect
          mismatches and risk patterns — without claiming funds were received.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/upload" variant="secondary">
            Upload proof
          </Button>
          <Button href="/analyses" variant="ghost">
            View analyses
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card title="Ready for confirmation">
          <StatusBadge status={AnalysisStatus.READY_FOR_CONFIRMATION} />
          <p className="mt-3 text-sm text-slate-600">
            Screening passed. Merchant still must confirm funds in their own ledger.
          </p>
        </Card>
        <Card title="Manual review">
          <StatusBadge status={AnalysisStatus.MANUAL_REVIEW} />
          <p className="mt-3 text-sm text-slate-600">
            Ambiguous signals — a human should inspect before acting.
          </p>
        </Card>
        <Card title="Suspicious">
          <StatusBadge status={AnalysisStatus.SUSPICIOUS} />
          <p className="mt-3 text-sm text-slate-600">
            Strong risk indicators. Do not treat as confirmed payment.
          </p>
        </Card>
      </section>

      <aside className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong className="font-semibold">Disclaimer:</strong> {PAYMENT_SCREENING_DISCLAIMER}
      </aside>

      <p className="text-sm text-slate-500">
        Dashboard placeholder — wire live metrics once the analysis pipeline is implemented.{" "}
        <Link href="/settings" className="text-yaqeen-700 underline">
          Settings
        </Link>
      </p>
    </div>
  );
}
