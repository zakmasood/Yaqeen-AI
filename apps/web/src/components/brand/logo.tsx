import Link from "next/link";
import clsx from "clsx";

export function Logo({ href = "/", className }: { href?: string | null; className?: string }) {
  const mark = (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yaqeen-700 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M12 3 5.2 6v6.4c0 4.2 2.8 7.1 6.8 8.8 4-1.7 6.8-4.6 6.8-8.8V6L12 3Z"
            fill="currentColor"
          />
          <path
            d="m8.4 12.1 2.4 2.5 4.8-5.2"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[17px] font-bold tracking-tight text-slate-900">Yaqeen AI</span>
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex items-center">
      {mark}
    </Link>
  );
}
