const medalStyles: Record<number, string> = {
  1: "bg-gold/20 text-gold border-gold/50 shadow-[0_0_18px_-4px_var(--gold)]",
  2: "bg-white/10 text-slate-200 border-white/30",
  3: "bg-[#d99a6c]/15 text-[#e0a878] border-[#d99a6c]/45",
};

export default function RankBadge({ rank }: { rank: number }) {
  const style = medalStyles[rank] ?? "bg-white/[0.04] text-fg-faint border-line";

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-sans text-sm font-semibold tabular-nums ${style}`}
    >
      {rank}
    </span>
  );
}
