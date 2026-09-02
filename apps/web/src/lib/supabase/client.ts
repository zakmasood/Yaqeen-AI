import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "./env";

export function createBrowserSupabaseClient(): SupabaseClient | null {
  const env = supabasePublicEnv();
  if (!env) return null;
  return createBrowserClient(env.url, env.anonKey);
}
