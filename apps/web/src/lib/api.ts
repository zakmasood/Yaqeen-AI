/** Thin API client for the FastAPI backend. */

import { readLocalSession } from "@/lib/local-session";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { mapAnalysis, type ApiAnalysis } from "@/lib/analysis-map";
import type { AnalysisResult, PaymentProvider } from "@yaqeen/shared";

export function getApiUrl(): string {
  if (typeof window === "undefined" && process.env.API_URL_INTERNAL) {
    return process.env.API_URL_INTERNAL;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${getApiUrl()}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json() as Promise<{ status: string }>;
}

async function browserAccessToken(): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return readLocalSession();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return "Request failed";
  } catch {
    // ignore non-JSON
  }
  return `Request failed (${res.status})`;
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const access = token === undefined ? await browserAccessToken() : token;
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  return res;
}

export type MerchantMe = {
  merchant_id: string;
  name: string;
  slug: string;
  email: string | null;
  role: string;
};

export type MerchantAccount = {
  id: string;
  merchant_id: string;
  provider: PaymentProvider;
  account_label: string;
  account_identifier: string;
  is_active: boolean;
};

export async function fetchAnalyses(token?: string | null): Promise<AnalysisResult[]> {
  const res = await apiFetch("/api/v1/analyses", {}, token);
  const body = (await res.json()) as { items?: ApiAnalysis[] };
  return (body.items ?? []).map(mapAnalysis);
}

export async function fetchAnalysis(id: string, token?: string | null): Promise<AnalysisResult> {
  const res = await apiFetch(`/api/v1/analyses/${id}`, {}, token);
  return mapAnalysis((await res.json()) as ApiAnalysis);
}

export async function createAnalysis(
  form: FormData,
  token?: string | null,
): Promise<AnalysisResult> {
  const res = await apiFetch("/api/v1/analyses", { method: "POST", body: form }, token);
  return mapAnalysis((await res.json()) as ApiAnalysis);
}

export async function recordAttestation(
  id: string,
  body: { decision: string; note?: string },
  token?: string | null,
): Promise<AnalysisResult> {
  const res = await apiFetch(
    `/api/v1/analyses/${id}/attestation`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    token,
  );
  return mapAnalysis((await res.json()) as ApiAnalysis);
}

export async function markAnalysisReviewed(
  id: string,
  token?: string | null,
): Promise<AnalysisResult> {
  const res = await apiFetch(`/api/v1/analyses/${id}/review`, { method: "PATCH" }, token);
  return mapAnalysis((await res.json()) as ApiAnalysis);
}

export async function fetchMe(token?: string | null): Promise<MerchantMe> {
  const res = await apiFetch("/api/v1/me", {}, token);
  return res.json() as Promise<MerchantMe>;
}

export async function fetchMerchantAccounts(token?: string | null): Promise<MerchantAccount[]> {
  const res = await apiFetch("/api/v1/merchant-accounts", {}, token);
  const body = (await res.json()) as { items?: MerchantAccount[] };
  return body.items ?? [];
}

export async function createMerchantAccount(
  body: {
    provider: PaymentProvider;
    account_label: string;
    account_identifier: string;
  },
  token?: string | null,
): Promise<MerchantAccount> {
  const res = await apiFetch(
    "/api/v1/merchant-accounts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    token,
  );
  return res.json() as Promise<MerchantAccount>;
}

export async function createInvite(
  body: {
    order_reference: string;
    expected_amount: number;
    invited_phone?: string;
  },
  token?: string | null,
): Promise<{
  token: string;
  path: string;
  order_reference: string;
  expected_amount: number;
  invited_phone: string | null;
  expires_at: string;
  merchant_name: string;
}> {
  const res = await apiFetch(
    "/api/v1/invites",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    token,
  );
  return res.json();
}

export type PublicInvite = {
  merchant_name: string;
  merchant_slug: string;
  order_reference: string;
  expected_amount: number;
  invited_phone: string | null;
  expires_at: string;
};

export async function fetchPublicInvite(token: string): Promise<PublicInvite> {
  const res = await fetch(`${getApiUrl()}/api/v1/public/invites/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  return res.json() as Promise<PublicInvite>;
}

export type PublicSubmissionAck = {
  id: string;
  received: boolean;
};

function publicAck(body: unknown): PublicSubmissionAck {
  const row = body as { id?: unknown };
  if (!row || typeof row.id !== "string") {
    throw new ApiError(502, "Submission was not acknowledged");
  }
  return { id: row.id, received: true };
}

export async function submitInviteProof(
  token: string,
  form: FormData,
): Promise<PublicSubmissionAck> {
  const res = await fetch(
    `${getApiUrl()}/api/v1/public/invites/${encodeURIComponent(token)}/submissions`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  return publicAck(await res.json());
}

export async function submitPublicProof(form: FormData): Promise<PublicSubmissionAck> {
  const res = await fetch(`${getApiUrl()}/api/v1/public/submissions`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  return publicAck(await res.json());
}
