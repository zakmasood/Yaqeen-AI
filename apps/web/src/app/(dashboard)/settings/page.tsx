"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { getApiUrl, fetchMe, fetchMerchantAccounts, createMerchantAccount } from "@/lib/api";
import type { MerchantAccount, MerchantMe } from "@/lib/api";
import { PaymentProvider } from "@yaqeen/shared";
import { providerLabel } from "@/components/ui/provider-mark";

export default function SettingsPage() {
  const [me, setMe] = useState<MerchantMe | null>(null);
  const [accounts, setAccounts] = useState<MerchantAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [label, setLabel] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [provider, setProvider] = useState<string>(PaymentProvider.EASYPAISA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchMe(), fetchMerchantAccounts()])
      .then(([merchant, list]) => {
        setMe(merchant);
        setAccounts(list);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load settings");
      });
  }, []);

  const submitPath = me?.slug ? `/submit?merchant=${encodeURIComponent(me.slug)}` : "/submit";
  const submitUrl =
    typeof window === "undefined" ? submitPath : `${window.location.origin}${submitPath}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(submitUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function onAddAccount() {
    if (!label.trim() || !identifier.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createMerchantAccount({
        provider: provider as PaymentProvider,
        account_label: label.trim(),
        account_identifier: identifier.trim(),
      });
      setAccounts((current) => [created, ...current]);
      setLabel("");
      setIdentifier("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Merchant configuration. Secrets stay in environment variables — never in the browser.
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-4">
        <Card title="API">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Backend URL</dt>
              <dd className="font-mono text-slate-800">{getApiUrl()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Supabase client</dt>
              <dd className="text-slate-800">Anon key only</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Merchant</dt>
              <dd className="text-slate-800">
                {me ? `${me.name} (${me.slug || "no slug"})` : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Customer submit link">
          <p className="text-sm text-slate-600">
            Share a link so a customer can upload proof without dashboard access.
          </p>
          <p className="mt-2 break-all font-mono text-xs text-slate-700">{submitUrl}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="outline" onClick={copyLink}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <a href={submitPath} className="text-sm font-semibold text-yaqeen-700">
              Open submit flow →
            </a>
          </div>
        </Card>

        <Card title="Receiving accounts">
          <div className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-slate-500">No receiving accounts yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {accounts.map((account) => (
                  <li key={account.id} className="flex justify-between gap-3 py-2">
                    <span className="font-medium text-slate-800">{account.account_label}</span>
                    <span className="text-slate-500">
                      {providerLabel(account.provider)} · {account.account_identifier}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Provider"
                name="account_provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                options={[
                  { value: PaymentProvider.EASYPAISA, label: "Easypaisa" },
                  { value: PaymentProvider.JAZZCASH, label: "JazzCash" },
                  { value: PaymentProvider.RAAST, label: "Raast" },
                  { value: PaymentProvider.BANK_TRANSFER, label: "Bank transfer" },
                ]}
              />
              <TextField
                label="Label"
                name="account_label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Account identifier"
                  name="account_identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>
            </div>
            <Button onClick={onAddAccount} disabled={saving || !label.trim() || !identifier.trim()}>
              {saving ? "Saving…" : "Add account"}
            </Button>
          </div>
        </Card>

        <Card title="WhatsApp">
          <p className="text-sm text-slate-600">
            Webhook verification and ingestion are handled by the API. Configure{" "}
            <code className="rounded bg-slate-100 px-1">WHATSAPP_*</code> on the server. Match{" "}
            <code className="rounded bg-slate-100 px-1">merchants.whatsapp_business_number</code> to
            inbound media.
          </p>
        </Card>
      </div>
    </div>
  );
}
