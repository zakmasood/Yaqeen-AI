import { Logo } from "@/components/brand/logo";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-md items-center px-4 py-3">
          <Logo href="/" />
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
    </div>
  );
}
