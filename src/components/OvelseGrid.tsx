"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, MapPin, Users } from "lucide-react";
import type { Kvalitet, OvelseStatus, OvelseType } from "@prisma/client";
import { statusTekst, statusVariant } from "@/lib/ovelseLabels";
import Avatar from "@/components/Avatar";
import Badge from "@/components/ui/Badge";
import KvalitetChip from "@/components/KvalitetChip";
import { cn } from "@/lib/utils";

export type SpillKort = {
  id: string;
  navn: string;
  status: OvelseStatus;
  type: OvelseType;
  vertNavn: string;
  vertId: string;
  lokasjon: string | null;
  fellesLek: boolean;
  kvaliteter: Kvalitet[];
  deltakere: { id: string; navn: string }[];
};

export default function OvelseGrid({ spill }: { spill: SpillKort[] }) {
  const [apen, setApen] = useState<string | null>(null);

  return (
    <motion.div
      layout
      className="grid grid-cols-1 gap-3 sm:grid-flow-row-dense sm:grid-cols-2 lg:grid-cols-3"
    >
      {spill.map((s) => {
        const er = apen === s.id;
        return (
          <motion.div
            layout
            key={s.id}
            className={cn(
              "overflow-hidden rounded-2xl border transition-colors",
              er
                ? "border-accent-2/60 bg-accent-2/[0.06] sm:col-span-2"
                : "border-line bg-white/[0.03] hover:border-line-strong"
            )}
          >
            <button
              type="button"
              onClick={() => setApen(er ? null : s.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg leading-tight text-fg">
                  {s.navn}
                </h3>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={statusVariant[s.status]}
                    pulse={s.status === "PAAGAAR"}
                  >
                    {statusTekst[s.status]}
                  </Badge>
                  <motion.span animate={{ rotate: er ? 180 : 0 }}>
                    <ChevronDown size={16} className="text-fg-faint" />
                  </motion.span>
                </div>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-faint">
                <span>{s.type === "LAG" ? "Lagøvelse" : "Individuell"}</span>
                <span>Vert: {s.vertNavn}</span>
                {s.lokasjon && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} /> {s.lokasjon}
                  </span>
                )}
                {s.fellesLek && (
                  <span className="inline-flex items-center gap-1 text-accent-3">
                    <Users size={11} /> Felles lek
                  </span>
                )}
              </p>

              {!er && s.kvaliteter.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.kvaliteter.slice(0, 3).map((k) => (
                    <KvalitetChip key={k} kvalitet={k} />
                  ))}
                  {s.kvaliteter.length > 3 && (
                    <span className="text-[11px] text-fg-faint">
                      +{s.kvaliteter.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>

            <AnimatePresence initial={false}>
              {er && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-line px-4 pt-3 pb-4">
                    <p className="text-[11px] tracking-widest text-fg-faint uppercase">
                      Egenskaper leken tester
                    </p>
                    {s.kvaliteter.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.kvaliteter.map((k) => (
                          <KvalitetChip key={k} kvalitet={k} size="md" />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-fg-faint">
                        Ingen egenskaper er valgt for denne leken.
                      </p>
                    )}

                    <p className="mt-4 text-[11px] tracking-widest text-fg-faint uppercase">
                      Deltakere ({s.deltakere.length})
                    </p>
                    {s.deltakere.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {s.deltakere.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.03] py-0.5 pr-2.5 pl-0.5 text-xs text-fg-dim"
                          >
                            <Avatar navn={d.navn} size={20} />
                            {d.navn}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-fg-faint">
                        Ingen deltakere registrert ennå.
                      </p>
                    )}

                    <div className="mt-4">
                      <Link
                        href={`/ovelser/${s.id}`}
                        className="inline-flex items-center gap-1 text-sm text-accent-2 hover:text-fg"
                      >
                        Åpne og administrer <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
