import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ScreeningPreview } from "@/components/site/screening-preview";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-glow grid min-h-screen bg-canvas lg:grid-cols-2">
      <aside className="hidden flex-col justify-between border-r border-line px-10 py-8 lg:flex">
        <Logo href="/" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Merchant desk</p>
          <p className="mt-3 max-w-md font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
            Screen the proof. You confirm the money.
          </p>
          <div className="mt-8 max-w-md">
            <ScreeningPreview />
          </div>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-muted">
          Payment proof screening. Receipt of funds is not independently confirmed.
        </p>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 lg:justify-end">
          <div className="lg:hidden">
            <Logo href="/" />
          </div>
          <ThemeToggle />
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
