"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { InfoBanner } from "@/components/ui/info-banner";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { IconCheck, IconLock, IconWhatsApp } from "@/components/icons";
import { submitPublicProof } from "@/lib/api";

type Step = 1 | 2 | 3;

export function SubmitWizard({
  merchantSlug,
  merchantName,
}: {
  merchantSlug: string;
  merchantName: string;
}) {
  const [step, setStep] = useState<Step>(1);
  const [orderRef, setOrderRef] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("merchant_slug", merchantSlug);
      form.append("order_reference", orderRef.trim());
      if (name.trim()) form.append("name", name.trim());
      if (phone.trim()) form.append("phone", phone.trim());
      const result = await submitPublicProof(form);
      setReference(result.id);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit proof");
    } finally {
      setPending(false);
    }
  }

  if (step === 3) {
    return (
      <div className="flex flex-col items-center px-2 py-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-yaqeen-700 text-white">
          <IconCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Proof submitted</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your payment proof has been sent to {merchantName}.
        </p>
        <div className="mt-6 w-full rounded-xl bg-slate-50 px-4 py-4">
          <p className="text-xs text-slate-500">Submission reference</p>
          <p className="mt-1 break-all text-lg font-bold text-yaqeen-700">{reference}</p>
        </div>
        <InfoBanner className="mt-4 w-full text-left">
          The merchant must still confirm receipt of funds.
        </InfoBanner>
        <a
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-yaqeen-600 py-3 text-sm font-semibold text-yaqeen-700"
          href={`https://wa.me/?text=${encodeURIComponent(
            `Payment proof submitted to ${merchantName}. Reference ${reference} for order ${orderRef}. Screening is not confirmation of funds.`,
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <IconWhatsApp className="h-5 w-5" />
          Notify merchant on WhatsApp
        </a>
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-yaqeen-700 underline"
          onClick={() => {
            setStep(1);
            setFile(null);
            setReference("");
          }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
          {merchantName.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p className="font-semibold text-slate-900">{merchantName}</p>
          <p className="text-sm text-slate-500">Submit payment proof</p>
        </div>
      </div>

      {step === 1 ? (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-yaqeen-50 text-yaqeen-700">
              <IconLock className="h-4 w-4" />
            </span>
            Your proof will be sent securely to {merchantName} for review.
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
            <p className="mt-3 text-sm text-red-600">
              This submit link is missing a merchant. Ask the merchant for a new link.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6">
          <h1 className="mb-3 text-lg font-bold text-slate-900">Upload payment proof</h1>
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
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <Button className="mt-6 w-full py-3" disabled={!file || pending} onClick={onSubmit}>
            {pending ? "Submitting…" : "Submit proof"}
          </Button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <IconLock className="h-3.5 w-3.5" />
            Only {merchantName} can view this submission.
          </p>
        </div>
      )}
    </div>
  );
}
