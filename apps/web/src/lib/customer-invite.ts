/** Merchant → customer WhatsApp text and submit URL. No Meta API. */

export function customerSubmitPath(slug: string | undefined): string {
  return slug ? `/submit?merchant=${encodeURIComponent(slug)}` : "/submit";
}

export function customerSubmitUrl(origin: string, slug: string | undefined): string {
  return `${origin.replace(/\/$/, "")}${customerSubmitPath(slug)}`;
}

export function customerProofMessage(opts: {
  merchantName: string;
  submitUrl: string;
  orderReference?: string;
  amountPkr?: string;
}): string {
  const lines = ["Please upload your payment screenshot here:", opts.submitUrl];
  const extras: string[] = [];
  const order = opts.orderReference?.trim();
  const amount = opts.amountPkr?.trim();
  if (order) extras.push(`Order ${order}`);
  if (amount) extras.push(`PKR ${amount}`);
  if (extras.length) lines.push(extras.join(" · "));
  lines.push("We'll screen it — this is not confirmation of funds.");
  const name = opts.merchantName.trim();
  if (name) lines.push(`— ${name}`);
  return lines.join("\n");
}

/** Digits for wa.me. Pakistani local 03… becomes 923…. */
export function normalizeWhatsAppPhone(phone?: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return digits;
}

export function whatsappShareUrl(text: string, phone?: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
