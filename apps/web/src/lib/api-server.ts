import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError, fetchAnalyses, fetchAnalysis, fetchMe, fetchMerchantAccounts } from "@/lib/api";
import type { AnalysisResult } from "@yaqeen/shared";
import type { MerchantAccount, MerchantMe } from "@/lib/api";

export async function getServerAccessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    const jar = await cookies();
    return jar.get("yaqeen-session")?.value ?? null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function loadAnalyses(): Promise<AnalysisResult[]> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }
  return fetchAnalyses(token);
}

export async function loadAnalysis(id: string): Promise<AnalysisResult> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }
  return fetchAnalysis(id, token);
}

export async function loadMe(): Promise<MerchantMe> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }
  return fetchMe(token);
}

export async function loadMerchantAccounts(): Promise<MerchantAccount[]> {
  const token = await getServerAccessToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }
  return fetchMerchantAccounts(token);
}
