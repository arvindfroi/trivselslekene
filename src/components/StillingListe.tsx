"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { SpillerDetalj, StillingRad } from "@/lib/stilling";
import { kvalitetIkon, kvalitetTekst } from "@/lib/ovelseLabels";
import RankBadge from "@/components/ui/RankBadge";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

function MiniStat({ label, verdi }: { label: string; verdi: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-center">
      <p className="font-display text-lg tabular-nums text-fg">{verdi}</p>
      <p className="text-[10px] tracking-widest text-fg-faint uppercase">
        {label}
      </p>
    </div>
  );
}

export default function StillingListe({
  rader,
  detaljer,
  meId,
  toppPoeng,
}: {
  rader: StillingRad[];
  detaljer: Record<string, SpillerDetalj>;
  meId: string;
  toppPoeng: number;
}) {
  const [apen, setApen] = useState<string | null>(null);

  return (
    <ul>
      {rader.map((rad, i) => {
        const er = apen === rad.userId;
        const d = detaljer[rad.userId];
        return (
          <li
            key={rad.userId}
            className={cn(
              i !== rader.length - 1 && "border-b border-line",
              i === 0 && rad.totalPoeng > 0 && "bg-gold/[0.07]",
              rad.userId === meId && "bg-accent-2/[0.06]"
            )}
          >
            <button
              type="button"
              onClick={() => setApen(er ? null : rad.userId)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
            >
              <RankBadge rank={i + 1} />
              <Avatar navn={rad.navn} bildeUrl={rad.bildeUrl} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium text-fg">
                    {rad.navn}
                    {rad.userId === meId && (
                      <span className="ml-2 text-xs text-accent-2">deg</span>
                    )}
                  </span>
                  <span className="shrink-0 font-display text-lg tabular-nums text-fg">
                    {rad.totalPoeng}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="bg-gradient-accent h-full rounded-full"
                      style={{
                        width: `${Math.max(4, (rad.totalPoeng / toppPoeng) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] text-fg-faint">
                    {rad.antallOvelser} øvelser
                  </span>
                </div>
              </div>
              <motion.span animate={{ rotate: er ? 180 : 0 }} className="shrink-0">
                <ChevronDown size={16} className="text-fg-faint" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {er && d && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 sm:px-5">
                    <div className="grid grid-cols-4 gap-2">
                      <MiniStat label="Kamper" verdi={String(d.kamper)} />
                      <MiniStat label="Seire" verdi={String(d.seire)} />
                      <MiniStat
                        label="Snitt"
                        verdi={d.kamper ? d.snitt.toFixed(1) : "–"}
                      />
                      <MiniStat label="Rekord" verdi={String(d.rekord)} />
                    </div>

                    <p className="mt-4 text-[11px] tracking-widest text-fg-faint uppercase">
                      Sterkest i
                    </p>
                    {d.kvaliteter.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.kvaliteter.map(({ kvalitet, poeng }) => {
                          const Ikon = kvalitetIkon[kvalitet];
                          return (
                            <span
                              key={kvalitet}
                              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-2.5 py-1 text-xs text-fg-dim"
                            >
                              <Ikon size={13} className="text-accent-2" />
                              {kvalitetTekst[kvalitet]}
                              <span className="font-medium text-fg tabular-nums">
                                {poeng}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-fg-faint">
                        Ingen egenskapspoeng ennå.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
