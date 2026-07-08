import type { Kvalitet } from "@prisma/client";
import { kvalitetIkon, kvalitetTekst } from "@/lib/ovelseLabels";

/** Liten pill som viser en egenskap med ikon (ingen emoji). */
export default function KvalitetChip({
  kvalitet,
  size = "sm",
}: {
  kvalitet: Kvalitet;
  size?: "sm" | "md";
}) {
  const Ikon = kvalitetIkon[kvalitet];
  const pad =
    size === "md" ? "px-2.5 py-1 text-xs gap-1.5" : "px-2 py-0.5 text-[11px] gap-1";
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-white/[0.03] text-fg-dim ${pad}`}
    >
      <Ikon size={size === "md" ? 13 : 12} className="shrink-0 text-accent-2" />
      {kvalitetTekst[kvalitet]}
    </span>
  );
}
