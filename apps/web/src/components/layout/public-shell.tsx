import { Logo } from "@/components/brand/logo";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-glow min-h-screen bg-canvas">
      <header className="border-b border-line/80 bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Logo href="/" />
          <p className="text-xs text-muted">Customer upload</p>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-8">{children}</main>
    </div>
  );
}
