import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SiteHome } from "@/components/site/site-home";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yaqeen AI: Screen the proof",
  description:
    "WhatsApp-first payment-proof screening for Pakistani merchants. Ready, needs review, or suspicious. Never a claim that funds arrived.",
};

function hasAuthCookie(jar: { getAll(): { name: string }[] }) {
  return jar.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

export default async function HomePage() {
  const jar = await cookies();
  if (jar.get("yaqeen-session")?.value) return <SiteHome signedIn />;
  if (!hasAuthCookie(jar)) return <SiteHome signedIn={false} />;

  const supabase = await createServerSupabaseClient();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  return <SiteHome signedIn={Boolean(session)} />;
}
