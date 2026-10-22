"use client";

import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { IconClose, IconMenu } from "@/components/icons";
import { Sidebar } from "@/components/layout/sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-[232px] bg-surface shadow-xl">
            <button
              type="button"
              className="absolute right-3 top-4 rounded-md p-1 text-muted"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <IconClose className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Logo />
          <button
            type="button"
            className="rounded-md p-1 text-ink"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu className="h-6 w-6" />
          </button>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
