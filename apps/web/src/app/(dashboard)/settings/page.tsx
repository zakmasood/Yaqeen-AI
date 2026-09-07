"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { CustomerInviteCard } from "@/components/customer-invite";
import { fetchMe, fetchMerchantAccounts, createMerchantAccount } from "@/lib/api";
import type { MerchantAccount, MerchantMe } from "@/lib/api";
import { PaymentProvider } from "@yaqeen/shared";
import { providerLabel } from "@/components/ui/provider-mark";

export default function SettingsPage() {
  const [me, setMe] = useState<MerchantMe | null>(null);
  const [accounts, setAccounts] = useState<MerchantAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>
      <p className="mt-1 text-sm text-muted">{me ? me.name : "Merchant configuration"}</p>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 space-y-4">
        {me?.slug ? (
          <CustomerInviteCard
            merchantName={me.name}
            merchantSlug={me.slug}
            orderReference="MV-1048"
            amountPkr="5000"
          />
        ) : null}

        <Card title="Receiving accounts">
          <div className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted">No receiving accounts yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {accounts.map((account) => (
                  <li key={account.id} className="flex justify-between gap-3 py-2">
                    <span className="font-medium text-ink">{account.account_label}</span>
                    <span className="text-muted">
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

        <p className="text-sm text-muted">
          Customers can also send a screenshot to your business number later.
        </p>
      </div>
    </div>
  );
}
