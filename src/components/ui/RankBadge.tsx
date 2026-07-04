const medalStyles: Record<number, string> = {
  1: "bg-gold text-ink border-ink",
  2: "bg-[#d7d9dd] text-ink border-ink",
  3: "bg-[#d99860] text-ink border-ink",
};

export default function RankBadge({ rank }: { rank: number }) {
  const style = medalStyles[rank] ?? "bg-paper text-ink-soft border-ink/40";

  return (
    <span
      className={`font-scoreboard flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm sm:text-base ${style}`}
    >
      {rank}
    </span>
  );
}
