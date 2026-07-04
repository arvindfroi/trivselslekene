import type { ReactNode } from "react";

const variants = {
  planlagt: "bg-paper-soft text-ink-soft border-ink/30",
  pagaar: "bg-coral text-paper border-ink",
  fullfort: "bg-forest text-paper border-ink",
  gold: "bg-gold text-ink border-ink",
  neutral: "bg-ink text-paper border-ink",
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
      className={`inline-flex items-center gap-1.5 border font-display text-[10px] sm:text-[11px] tracking-widest uppercase px-2.5 py-1 ${variants[variant]} ${className}`}
    >
      {pulse && (
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-paper" />
      )}
      {children}
    </span>
  );
}
