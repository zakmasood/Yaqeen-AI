"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { InfoBanner } from "@/components/ui/info-banner";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { CustomerInviteCard } from "@/components/customer-invite";
import { createAnalysis, fetchMe } from "@/lib/api";
import type { MerchantMe } from "@/lib/api";
import { PaymentProvider } from "@yaqeen/shared";

export function NewAnalysisForm() {
  const router = useRouter();
  const [me, setMe] = useState<MerchantMe | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<string>(PaymentProvider.EASYPAISA);
  const [order, setOrder] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch(() => undefined);
  }, []);

  async function onSubmit() {
    if (!file) {
      setError("Choose a payment-proof screenshot first.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (order.trim()) form.append("order_reference", order.trim());
      if (amount.trim()) form.append("expected_amount", amount.trim());
      if (provider) form.append("expected_provider", provider);
      const result = await createAnalysis(form);
      router.push(`/analyses/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start analysis");
      setPending(false);
    }
  }

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <FileDropzone variant="merchant" onFileSelected={setFile} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Expected payment</h2>
          <div className="space-y-4">
            <TextField
              label="Expected amount (PKR)"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <SelectField
              label="Provider"
              name="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              options={[
                { value: PaymentProvider.EASYPAISA, label: "Easypaisa" },
                { value: PaymentProvider.JAZZCASH, label: "JazzCash" },
                { value: PaymentProvider.RAAST, label: "Raast" },
                { value: PaymentProvider.BANK_TRANSFER, label: "Bank transfer" },
                { value: PaymentProvider.UNKNOWN, label: "Unknown" },
              ]}
            />
            <TextField
              label="Order reference"
              name="order"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
            />
          </div>
        </section>
      </div>

      {me?.slug ? (
        <div className="mt-5">
          <CustomerInviteCard
            merchantName={me.name}
            merchantSlug={me.slug}
            orderReference={order}
            amountPkr={amount}
            showOrderFields={false}
          />
        </div>
      ) : null}

      <InfoBanner tone="success" className="mt-5">
        Expected details let Yaqeen compare the screenshot against what your business should
        receive. Always confirm receipt independently.
      </InfoBanner>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <Button className="mt-5 w-full py-3 text-base" onClick={onSubmit} disabled={pending || !file}>
        {pending ? "Analysing…" : "Analyse proof"}
      </Button>
    </div>
  );
}
