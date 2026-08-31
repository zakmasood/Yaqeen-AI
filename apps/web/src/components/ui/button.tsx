import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "dangerOutline";

const variants: Record<Variant, string> = {
  primary: "bg-yaqeen-700 text-white hover:bg-yaqeen-800",
  secondary: "bg-white text-yaqeen-800 hover:bg-yaqeen-50",
  outline: "bg-white text-yaqeen-700 ring-1 ring-inset ring-yaqeen-600 hover:bg-yaqeen-50",
  ghost: "bg-transparent text-yaqeen-700 hover:underline",
  danger: "bg-red-700 text-white hover:bg-red-800",
  dangerOutline: "bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50",
};

type ButtonProps = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({
  children,
  variant = "primary",
  className,
  href,
  type = "button",
  onClick,
  disabled,
}: ButtonProps) {
  const classes = clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
