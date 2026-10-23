"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { InfoBanner } from "@/components/ui/info-banner";
import { getApiUrl } from "@/lib/api";
import { writeLocalSession } from "@/lib/local-session";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = createBrowserSupabaseClient();
    setPending(true);
    setError(null);
    if (!supabase) {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json().catch(() => null)) as {
        access_token?: string;
        detail?: string;
      } | null;
      if (!res.ok || !body?.access_token) {
        setError(body?.detail || "Email or password is wrong");
        setPending(false);
        return;
      }
      writeLocalSession(body.access_token);
      router.replace("/overview");
      router.refresh();
      return;
    }
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      setError(signError.message);
      setPending(false);
      return;
    }
    router.replace("/overview");
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        For the shop. Customers use the link you send. They don&apos;t need an account.
      </p>

      {!configured ? (
        <InfoBanner className="mt-5">
          Local desk. ManoVersa: demo@manoversa.com / demo-demo. North Shop:
          demo2@northshop.com / demo-demo.
        </InfoBanner>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button className="w-full py-3" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
