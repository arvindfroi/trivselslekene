import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans text-sm font-medium px-5 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap";

const variants = {
  primary: `${base} bg-gradient-accent text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] hover:brightness-110 hover:shadow-[0_10px_36px_-10px_rgba(168,85,247,0.65)]`,
  secondary: `${base} bg-white/[0.06] text-fg border border-line hover:bg-white/[0.1] hover:border-line-strong`,
  outline: `${base} bg-transparent text-fg border border-line-strong hover:bg-white/[0.06]`,
  danger: `${base} bg-transparent text-red-300 border border-red-500/40 hover:bg-red-500/15`,
};

type Variant = keyof typeof variants;

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
