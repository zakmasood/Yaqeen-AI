"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/brand/logo";
import { IconClose, IconMenu } from "@/components/icons";
import { deskNav } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearLocalSession } from "@/lib/local-session";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createBrowserSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    clearLocalSession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="site-glow flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Logo href="/overview" />
          <nav className="hidden items-center gap-6 md:flex">
            {deskNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "text-sm transition hover:text-ink",
                    active ? "font-medium text-ink" : "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/upload"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:opacity-90"
            >
              Upload
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="hidden text-sm text-muted transition hover:text-ink md:inline"
            >
              Sign out
            </button>
            <button
              type="button"
              className="rounded-md p-1 text-ink md:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {open ? (
          <nav className="border-t border-line px-5 py-3 md:hidden">
            {deskNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "block py-2.5 text-sm",
                    active ? "font-medium text-ink" : "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className="block py-2.5 text-sm text-muted"
            >
              Sign out
            </button>
          </nav>
        ) : null}
      </header>

      <div className="min-w-0 flex-1">
        {children}
      </div>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-muted">
          Payment proof screening for this shop. Receipt of funds is not independently confirmed.
        </p>
      </footer>
    </div>
  );
}
