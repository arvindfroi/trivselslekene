"use client";

import { Check } from "lucide-react";

export function ChoiceCard({
  valgt,
  onClick,
  tittel,
  tekst,
}: {
  valgt: boolean;
  onClick: () => void;
  tittel: string;
  tekst?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        valgt
          ? "border-accent-2 bg-accent-2/10 shadow-[0_0_0_1px_var(--accent-2)]"
          : "border-line bg-white/[0.03] hover:border-line-strong hover:bg-white/[0.06]"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-display text-lg text-fg">{tittel}</span>
        {valgt && <Check size={18} className="text-accent-2" />}
      </span>
      {tekst && <span className="mt-1 block text-sm text-fg-dim">{tekst}</span>}
    </button>
  );
}

export function FormatChip({
  valgt,
  onClick,
  tittel,
  hint,
}: {
  valgt: boolean;
  onClick: () => void;
  tittel: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all ${
        valgt
          ? "border-accent-2 bg-accent-2/10"
          : "border-line bg-white/[0.03] hover:border-line-strong hover:bg-white/[0.06]"
      }`}
    >
      <span className="block font-medium text-fg">{tittel}</span>
      <span className="mt-0.5 block text-xs text-fg-faint">{hint}</span>
    </button>
  );
}
