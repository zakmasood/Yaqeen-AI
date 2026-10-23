export function PageHeader({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker?: string;
  title: string;
  lede?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{kicker}</p>
        ) : null}
        <h1 className="font-display text-4xl font-semibold leading-[0.95] tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
        {lede ? <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{lede}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
