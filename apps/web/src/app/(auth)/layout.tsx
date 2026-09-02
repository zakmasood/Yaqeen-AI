import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md items-center px-4 py-3">
          <Logo href="/login" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">{children}</main>
    </div>
  );
}
