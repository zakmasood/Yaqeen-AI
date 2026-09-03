"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { IconWhatsApp } from "@/components/icons";
import {
  customerProofMessage,
  customerSubmitPath,
  customerSubmitUrl,
  whatsappShareUrl,
} from "@/lib/customer-invite";

export function CustomerInviteCard({
  merchantName,
  merchantSlug,
  orderReference = "",
  amountPkr = "",
  showOrderFields = true,
}: {
  merchantName: string;
  merchantSlug: string;
  orderReference?: string;
  amountPkr?: string;
  showOrderFields?: boolean;
}) {
  const [order, setOrder] = useState(orderReference);
  const [amount, setAmount] = useState(amountPkr);
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const submitPath = customerSubmitPath(merchantSlug);
  const submitUrl = origin ? customerSubmitUrl(origin, merchantSlug) : submitPath;
  const messageOrder = showOrderFields ? order : orderReference;
  const messageAmount = showOrderFields ? amount : amountPkr;
  const message = useMemo(
    () =>
      customerProofMessage({
        merchantName,
        submitUrl,
        orderReference: messageOrder,
        amountPkr: messageAmount,
      }),
    [merchantName, submitUrl, messageOrder, messageAmount],
  );
  const waHref = whatsappShareUrl(message, phone);

  async function copy(kind: "link" | "message", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <Card title="Ask customer for proof">
      <p className="text-sm text-slate-600">
        Send this WhatsApp text so the customer can upload a screenshot. Screening is not
        confirmation of funds.
      </p>
      <p className="mt-2 break-all font-mono text-xs text-slate-700">{submitUrl}</p>

      {showOrderFields ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField
            label="Order reference"
            name="invite_order"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
          />
          <TextField
            label="Amount (PKR)"
            name="invite_amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
      ) : null}

      <div className="mt-3">
        <TextField
          label="Customer WhatsApp (optional)"
          name="invite_phone"
          placeholder="0300•••••••"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>

      <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
        {message}
      </pre>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => copy("link", submitUrl)}>
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
        <Button variant="outline" onClick={() => copy("message", message)}>
          {copied === "message" ? "Copied" : "Copy message"}
        </Button>
        <a
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-yaqeen-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yaqeen-800"
          href={waHref}
          target="_blank"
          rel="noreferrer"
        >
          <IconWhatsApp className="h-4 w-4" />
          Open WhatsApp
        </a>
        <a href={submitPath} className="self-center text-sm font-semibold text-yaqeen-700">
          Open submit flow →
        </a>
      </div>
    </Card>
  );
}
