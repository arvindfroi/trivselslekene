import type { ReactNode } from "react";

const variants = {
  planlagt: "bg-white/[0.06] text-fg-dim border-line",
  pagaar: "bg-accent-3/10 text-accent-3 border-accent-3/40",
  fullfort: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  gold: "bg-gold/15 text-gold border-gold/40",
  neutral: "bg-white/10 text-fg border-line-strong",
};

export type BadgeVariant = keyof typeof variants;

export default function Badge({
  children,
  variant = "planlagt",
  pulse = false,
  className = "",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium tracking-wide uppercase ${variants[variant]} ${className}`}
    >
      {pulse && (
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
