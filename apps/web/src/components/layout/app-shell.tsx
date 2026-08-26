import { Nav } from "@/components/layout/nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Yaqeen AI screens payment proofs. It does not confirm receipt of funds.
      </footer>
    </div>
  );
}
