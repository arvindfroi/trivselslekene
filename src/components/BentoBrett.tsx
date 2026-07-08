"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
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
  kvaliteter: Kvalitet[];
  deltakere: { id: string; navn: string }[];
};

export type SpillerKort = {
  id: string;
  navn: string;
  bildeUrl: string | null;
  kvaliteter: Kvalitet[];
};

// Bento-mønster: varierte flis-størrelser som gjentas nedover rutenettet.
const SPENN = [
  "sm:col-span-2 sm:row-span-2",
  "sm:col-span-2",
  "",
  "sm:row-span-2",
  "",
  "sm:col-span-2",
];

type Valg =
  | { type: "spill"; id: string }
  | { type: "spiller"; id: string }
  | null;

export default function BentoBrett({
  spill,
  spillere,
}: {
  spill: SpillKort[];
  spillere: SpillerKort[];
}) {
  const [valg, setValg] = useState<Valg>(null);

  const valgtSpill =
    valg?.type === "spill" ? spill.find((s) => s.id === valg.id) : null;
  const valgtSpiller =
    valg?.type === "spiller" ? spillere.find((s) => s.id === valg.id) : null;

  const spillerSpillIder =
    valg?.type === "spiller"
      ? new Set(
          spill
            .filter(
              (s) =>
                s.vertId === valg.id ||
                s.deltakere.some((d) => d.id === valg.id)
            )
            .map((s) => s.id)
        )
      : null;

  const relevanteKvaliteter = valgtSpill
    ? valgtSpill.kvaliteter
    : valgtSpiller
      ? valgtSpiller.kvaliteter
      : [];

  return (
    <div>
      {/* Spillere — trykk for å se deres egenskaper */}
      {spillere.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {spillere.map((s) => {
            const aktiv = valg?.type === "spiller" && valg.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setValg(aktiv ? null : { type: "spiller", id: s.id })
                }
                className={cn(
                  "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors",
                  aktiv
                    ? "border-accent-2 bg-accent-2/10 text-fg"
                    : "border-line bg-white/[0.03] text-fg-dim hover:text-fg"
                )}
              >
                <Avatar navn={s.navn} bildeUrl={s.bildeUrl} size={24} />
                {s.navn}
              </button>
            );
          })}
        </div>
      )}

      {/* Detaljpanel — relevante egenskaper for valgt flis eller spiller */}
      {(valgtSpill || valgtSpiller) && (
        <div className="surface animate-fade-up mb-5 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] tracking-widest text-fg-faint uppercase">
                {valgtSpill ? "Leken tester" : "Egenskaper i spill for"}
              </p>
              <p className="font-display text-lg text-fg">
                {valgtSpill?.navn ?? valgtSpiller?.navn}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setValg(null)}
              className="shrink-0 rounded-full p-1 text-fg-faint hover:text-fg"
              aria-label="Lukk"
            >
              <X size={16} />
            </button>
          </div>

          {relevanteKvaliteter.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {relevanteKvaliteter.map((k) => (
                <KvalitetChip key={k} kvalitet={k} size="md" />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-faint">
              Ingen egenskaper er knyttet til dette ennå.
            </p>
          )}

          {valgtSpill && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="truncate text-xs text-fg-faint">
                Vert: {valgtSpill.vertNavn}
                {valgtSpill.deltakere.length > 0 &&
                  ` · ${valgtSpill.deltakere.length} deltakere`}
              </p>
              <Link
                href={`/ovelser/${valgtSpill.id}`}
                className="inline-flex shrink-0 items-center gap-1 text-sm text-accent-2 hover:text-fg"
              >
                Åpne <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Bento-rutenett */}
      <div className="grid grid-cols-2 gap-3 sm:auto-rows-[9rem] sm:grid-flow-row-dense sm:grid-cols-4">
        {spill.map((s, i) => {
          const spenn = SPENN[i % SPENN.length];
          const stor = spenn.includes("row-span-2");
          const aktiv = valg?.type === "spill" && valg.id === s.id;
          const uthevet = spillerSpillIder?.has(s.id);
          const maksChips = stor ? 8 : 3;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                setValg(aktiv ? null : { type: "spill", id: s.id })
              }
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all",
                spenn,
                aktiv
                  ? "border-accent-2 bg-accent-2/10"
                  : uthevet
                    ? "border-accent-2/60 bg-white/[0.05]"
                    : "border-line bg-white/[0.03] hover:border-line-strong hover:bg-white/[0.05]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={cn(
                    "font-display leading-tight text-fg",
                    stor ? "text-2xl" : "text-lg"
                  )}
                >
                  {s.navn}
                </h3>
                <Badge
                  variant={statusVariant[s.status]}
                  pulse={s.status === "PAAGAAR"}
                >
                  {statusTekst[s.status]}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-fg-faint">
                {s.type === "LAG" ? "Lagøvelse" : "Individuell"} · Vert:{" "}
                {s.vertNavn}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
                {s.kvaliteter.slice(0, maksChips).map((k) => (
                  <KvalitetChip key={k} kvalitet={k} />
                ))}
                {s.kvaliteter.length > maksChips && (
                  <span className="text-[11px] text-fg-faint">
                    +{s.kvaliteter.length - maksChips}
                  </span>
                )}
                {s.kvaliteter.length === 0 && (
                  <span className="text-[11px] text-fg-faint">
                    Ingen egenskaper
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
