import clsx from "clsx";

type CardProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={clsx("rounded-xl border border-line bg-surface p-5 shadow-card", className)}>
      {title ? <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2> : null}
      {children}
    </div>
  );
}
