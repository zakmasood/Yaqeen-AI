import { Logo } from "@/components/brand/logo";
import { IconMenu } from "@/components/icons";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Logo href="/" />
          <span className="text-slate-700" aria-hidden>
            <IconMenu className="h-6 w-6" />
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
    </div>
  );
}
