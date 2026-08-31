"use client";

import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { InfoBanner } from "@/components/ui/info-banner";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { PaymentProvider } from "@yaqeen/shared";

export default function NewAnalysisPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-900">New analysis</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <FileDropzone variant="merchant" />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Expected payment</h2>
          <div className="space-y-4">
            <TextField label="Expected amount" name="amount" defaultValue="PKR 5,000" />
            <SelectField
              label="Provider"
              name="provider"
              defaultValue={PaymentProvider.EASYPAISA}
              options={[
                { value: PaymentProvider.EASYPAISA, label: "Easypaisa" },
                { value: PaymentProvider.JAZZCASH, label: "JazzCash" },
                { value: PaymentProvider.RAAST, label: "Raast" },
                { value: PaymentProvider.BANK_TRANSFER, label: "Bank transfer" },
                { value: PaymentProvider.UNKNOWN, label: "Unknown" },
              ]}
            />
            <TextField label="Recipient account" name="account" defaultValue="0300 •••• 567" />
            <TextField label="Order reference" name="order" defaultValue="MV-1048" />
          </div>
        </section>
      </div>

      <InfoBanner tone="success" className="mt-5">
        Expected details let Yaqeen compare the screenshot against what your business should
        receive. Always confirm receipt independently.
      </InfoBanner>

      <Button href="/analyses/MV-1048" className="mt-5 w-full py-3 text-base">
        Analyse proof
      </Button>
    </div>
  );
}
