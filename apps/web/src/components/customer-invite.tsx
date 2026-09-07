"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { IconWhatsApp } from "@/components/icons";
import { createInvite } from "@/lib/api";
import {
  customerProofMessage,
  inviteSubmitPath,
  inviteSubmitUrl,
  whatsappShareUrl,
} from "@/lib/customer-invite";

export function CustomerInviteCard({
  merchantName,
  orderReference = "",
  amountPkr = "",
  showOrderFields = true,
}: {
  merchantName: string;
  merchantSlug?: string;
  orderReference?: string;
  amountPkr?: string;
  showOrderFields?: boolean;
}) {
  const [order, setOrder] = useState(orderReference);
  const [amount, setAmount] = useState(amountPkr);
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  const messageOrder = showOrderFields ? order : orderReference;
  const messageAmount = showOrderFields ? amount : amountPkr;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const submitPath = token ? inviteSubmitPath(token) : "";
  const submitUrl = token && origin ? inviteSubmitUrl(origin, token) : submitPath;
  const canMint = Boolean(messageOrder.trim() && Number(messageAmount) > 0);
  const message = useMemo(
    () =>
      token
        ? customerProofMessage({
            merchantName,
            submitUrl,
            orderReference: messageOrder,
            amountPkr: messageAmount,
          })
        : "",
    [merchantName, submitUrl, messageOrder, messageAmount, token],
  );
  const waHref = message ? whatsappShareUrl(message, phone) : "";

  function clearMint() {
    setToken(null);
    setError(null);
  }

  async function mint(): Promise<string | null> {
    if (!canMint) return null;
    if (token) return token;
    setPending(true);
    setError(null);
    try {
      const created = await createInvite({
        order_reference: messageOrder.trim(),
        expected_amount: Number(messageAmount),
        invited_phone: phone.trim() || undefined,
      });
      setToken(created.token);
      return created.token;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invite");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function copy(kind: "link" | "message") {
    const minted = await mint();
    if (!minted) return;
    const url = inviteSubmitUrl(window.location.origin, minted);
    const text =
      kind === "link"
        ? url
        : customerProofMessage({
            merchantName,
            submitUrl: url,
            orderReference: messageOrder,
            amountPkr: messageAmount,
          });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  async function openWhatsApp() {
    const minted = await mint();
    if (!minted) return;
    const url = inviteSubmitUrl(window.location.origin, minted);
    const text = customerProofMessage({
      merchantName,
      submitUrl: url,
      orderReference: messageOrder,
      amountPkr: messageAmount,
    });
    window.open(whatsappShareUrl(text, phone), "_blank", "noreferrer");
  }

  return (
    <Card title="Ask customer for proof">
      <p className="text-sm text-muted">
        Creates a unique link for this order. The customer only uploads a screenshot.
      </p>

      {showOrderFields ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField
            label="Order reference"
            name="invite_order"
            value={order}
            onChange={(event) => {
              setOrder(event.target.value);
              clearMint();
            }}
          />
          <TextField
            label="Amount (PKR)"
            name="invite_amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              clearMint();
            }}
          />
        </div>
      ) : null}

      <div className="mt-3">
        <TextField
          label="Customer WhatsApp (optional)"
          name="invite_phone"
          placeholder="0300•••••••"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            clearMint();
          }}
        />
      </div>

      {submitUrl ? (
        <>
          <p className="mt-4 break-all font-mono text-xs text-ink">{submitUrl}</p>
          <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-lift p-3 text-xs text-ink">
            {message}
          </pre>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {canMint
            ? "Copy the link or open WhatsApp to mint this invite."
            : "Add an order reference and amount first."}
        </p>
      )}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => copy("link")} disabled={!canMint || pending}>
          {copied === "link" ? "Copied" : pending ? "Creating…" : "Copy link"}
        </Button>
        <Button variant="outline" onClick={() => copy("message")} disabled={!canMint || pending}>
          {copied === "message" ? "Copied" : "Copy message"}
        </Button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-yaqeen-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yaqeen-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={openWhatsApp}
          disabled={!canMint || pending}
        >
          <IconWhatsApp className="h-4 w-4" />
          Open WhatsApp
        </button>
        {submitPath ? (
          <a href={submitPath} className="self-center text-sm font-semibold text-yaqeen-500">
            Open submit flow →
          </a>
        ) : null}
      </div>
    </Card>
  );
}
