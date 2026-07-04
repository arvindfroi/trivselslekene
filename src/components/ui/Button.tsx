import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 font-display text-xs sm:text-sm tracking-wide uppercase border-2 border-ink px-4 sm:px-5 py-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none whitespace-nowrap";

const variants = {
  primary: `${base} bg-gold text-ink shadow-[3px_3px_0_0_var(--ink)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--ink)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--ink)]`,
  secondary: `${base} bg-ink text-paper shadow-[3px_3px_0_0_var(--gold)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--gold)] active:translate-y-0 active:shadow-[2px_2px_0_0_var(--gold)]`,
  outline: `${base} bg-paper text-ink hover:bg-ink hover:text-paper`,
  danger: `${base} bg-paper text-coral-dark border-coral hover:bg-coral hover:text-paper`,
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
