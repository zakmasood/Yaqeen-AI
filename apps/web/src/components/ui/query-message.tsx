export function QueryMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center shadow-card">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}
