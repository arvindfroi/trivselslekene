"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
  topp3,
  stor = false,
  className,
}: {
  Ikon: LucideIcon;
  tittel: string;
  tekst?: string;
  leder: FlisLeder;
  topp3?: {
    navn: string;
    bildeUrl: string | null;
    verdi: string;
  }[];
  stor?: boolean;
  className?: string;
}) {
  const [apen, setApen] = useState(false);
  const harTopp3 = topp3 && topp3.length > 1;

  return (
    <button
      type="button"
      onClick={() => harTopp3 && setApen(!apen)}
      className={cn(
        "surface flex flex-col overflow-hidden rounded-2xl p-4 text-left transition-colors",
        harTopp3 && "cursor-pointer hover:border-line-strong",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "bg-gradient-accent flex shrink-0 items-center justify-center rounded-xl text-white",
            stor ? "h-14 w-14" : "h-10 w-10"
          )}
        >
          <Ikon size={stor ? 26 : 18} />
        </span>
        {harTopp3 && (
          <span className="mt-1 shrink-0 transition-transform duration-200" style={{ transform: apen ? "rotate(180deg)" : "rotate(0deg)" }}>
            <ChevronDown size={16} className="text-fg-faint" />
          </span>
        )}
      </div>

      <div className={cn(stor ? "mt-4" : "mt-3")}>
        <p className={cn("font-medium text-fg", stor ? "text-lg" : "text-sm")}>
          {tittel}
        </p>
        {tekst && <p className="text-[11px] text-fg-faint">{tekst}</p>}
      </div>

      {/* Kollapset: kun leder */}
      {!apen && (
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
      )}

      {/* Utvidet: topp 3 */}
      {apen && topp3 && topp3.length > 0 && (
        <div className="overflow-hidden">
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[11px] tracking-widest text-fg-faint uppercase mb-2">
              Topp 3
            </p>
            <div className="flex flex-col gap-1.5">
              {topp3.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs text-fg-faint tabular-nums">
                    {i + 1}
                  </span>
                  <Avatar navn={l.navn} bildeUrl={l.bildeUrl} size={20} />
                  <span className="truncate text-sm font-medium text-fg">
                    {l.navn}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-fg-dim tabular-nums">
                    {l.verdi}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
