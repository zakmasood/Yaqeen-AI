import clsx from "clsx";

type CardProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-surface p-6", className)}>
      {title ? (
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-ink">{title}</h2>
      ) : null}
      {children}
    </div>
  );
}
