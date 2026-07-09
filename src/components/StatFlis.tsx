import type { LucideIcon } from "lucide-react";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

export type FlisLeder = {
  navn: string;
  bildeUrl: string | null;
  verdi: string;
} | null;

/** Én flis i en bento-mosaikk: ikon, tittel og en leder (avatar + verdi). */
export default function StatFlis({
  Ikon,
  tittel,
  tekst,
  leder,
  stor = false,
  className,
}: {
  Ikon: LucideIcon;
  tittel: string;
  tekst?: string;
  leder: FlisLeder;
  stor?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface flex flex-col overflow-hidden rounded-2xl p-4",
        className
      )}
    >
      <span
        className={cn(
          "bg-gradient-accent flex shrink-0 items-center justify-center rounded-xl text-white",
          stor ? "h-14 w-14" : "h-10 w-10"
        )}
      >
        <Ikon size={stor ? 26 : 18} />
      </span>

      <div className={cn(stor ? "mt-4" : "mt-3")}>
        <p className={cn("font-medium text-fg", stor ? "text-lg" : "text-sm")}>
          {tittel}
        </p>
        {tekst && <p className="text-[11px] text-fg-faint">{tekst}</p>}
      </div>

      <div className="mt-auto pt-3">
        {leder ? (
          <div className="flex items-center gap-2">
            <Avatar
              navn={leder.navn}
              bildeUrl={leder.bildeUrl}
              size={stor ? 28 : 22}
            />
            <span className="truncate text-sm font-medium text-fg">
              {leder.navn}
            </span>
            <span className="ml-auto shrink-0 text-xs text-fg-dim tabular-nums">
              {leder.verdi}
            </span>
          </div>
        ) : (
          <p className="text-sm text-fg-faint">Ingen ennå</p>
        )}
      </div>
    </div>
  );
}
