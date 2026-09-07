"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { InfoBanner } from "@/components/ui/info-banner";
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
    if (!supabase) {
      setError("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to sign in.");
      return;
    }
    setPending(true);
    setError(null);
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      setError(signError.message);
      setPending(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Merchant sign in</h1>

      {!configured ? (
        <InfoBanner className="mt-5">
          Supabase is not configured. Add{" "}
          <code className="rounded bg-lift px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-lift px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> then link your
          user in <code className="rounded bg-lift px-1">merchant_users</code>.
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
        <Button className="w-full py-3" type="submit" disabled={pending || !configured}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
