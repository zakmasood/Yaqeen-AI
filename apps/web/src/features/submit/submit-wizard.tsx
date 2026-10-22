"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { InfoBanner } from "@/components/ui/info-banner";
import { QueryMessage } from "@/components/ui/query-message";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { IconCheck, IconLock, IconWhatsApp } from "@/components/icons";
import { fetchPublicInvite, submitInviteProof, submitPublicProof } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { PublicInvite } from "@/lib/api";
import { formatPkr } from "@/lib/format";

type Step = 1 | 2 | 3;

export function SubmitWizard({
  token,
  merchantSlug = "",
  merchantName = "Merchant",
}: {
  token?: string;
  merchantSlug?: string;
  merchantName?: string;
}) {
  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(token ? 2 : 1);
  const [orderRef, setOrderRef] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicInvite(token)
      .then((row) => {
        setInvite(row);
        setOrderRef(row.order_reference);
        if (row.invited_phone) setPhone(row.invited_phone);
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Could not reach Yaqeen. Check the connection and try again.",
        );
      });
  }, [token]);

  const shopName = invite?.merchant_name || merchantName;
  const lockedOrder = invite?.order_reference || orderRef;
  const lockedAmount = invite?.expected_amount;

  async function onSubmit() {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (name.trim()) form.append("name", name.trim());
      if (phone.trim()) form.append("phone", phone.trim());
      const result = token
        ? await submitInviteProof(token, form)
        : await submitPublicProof(
            (() => {
              form.append("merchant_slug", merchantSlug);
              form.append("order_reference", orderRef.trim());
              return form;
            })(),
          );
      setReference(result.id);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit proof");
    } finally {
      setPending(false);
    }
  }

  if (token && !invite && !loadError) {
    return <QueryMessage title="Loading invite…" />;
  }

  if (loadError) {
    return <QueryMessage title="Invite unavailable">{loadError}</QueryMessage>;
  }

  if (step === 3) {
    return (
      <div className="flex flex-col items-center px-2 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-yaqeen-700 text-white">
          <IconCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-ink">Proof submitted</h1>
        <p className="mt-1 text-sm text-muted">Your payment proof has been sent to {shopName}.</p>
        <div className="mt-6 w-full rounded-xl bg-lift px-4 py-4">
          <p className="text-xs text-muted">Submission reference</p>
          <p className="mt-1 break-all text-lg font-bold text-yaqeen-500">{reference}</p>
        </div>
        <InfoBanner className="mt-4 w-full text-left">
          The merchant must still confirm receipt of funds.
        </InfoBanner>
        <a
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-yaqeen-600 py-3 text-sm font-semibold text-yaqeen-500"
          href={`https://wa.me/?text=${encodeURIComponent(
            `Payment proof submitted to ${shopName}. Reference ${reference} for order ${lockedOrder}. Screening is not confirmation of funds.`,
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <IconWhatsApp className="h-5 w-5" />
          Notify merchant on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-lift text-sm font-bold text-ink">
          {shopName.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p className="font-semibold text-ink">{shopName}</p>
          <p className="text-sm text-muted">
            {invite
              ? `${invite.order_reference}${lockedAmount != null ? ` · ${formatPkr(lockedAmount)}` : ""}`
              : "Submit payment proof"}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lift text-yaqeen-500">
              <IconLock className="h-4 w-4" />
            </span>
            Your proof will be sent securely to {shopName} for review.
          </p>
          <div className="mt-5">
            <TextField
              label="Order reference"
              name="order"
              value={orderRef}
              onChange={(event) => setOrderRef(event.target.value)}
            />
          </div>
          <Button
            className="mt-6 w-full py-3"
            onClick={() => setStep(2)}
            disabled={!orderRef.trim() || !merchantSlug}
          >
            Continue
          </Button>
          {!merchantSlug ? (
            <p className="mt-3 text-sm text-danger">
              This submit link is missing a merchant. Ask the merchant for a new link.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6">
          <h1 className="mb-3 text-lg font-bold text-ink">Upload payment proof</h1>
          <FileDropzone variant="customer" onFileSelected={setFile} />
          <div className="mt-5 space-y-4">
            <TextField
              label="Your name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              label="Phone number"
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          <Button className="mt-6 w-full py-3" disabled={!file || pending} onClick={onSubmit}>
            {pending ? "Submitting…" : "Submit proof"}
          </Button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <IconLock className="h-3.5 w-3.5" />
            Only {shopName} can view this submission.
          </p>
        </div>
      )}
    </div>
  );
}
