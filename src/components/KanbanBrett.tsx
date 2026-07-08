"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { Kvalitet, OvelseStatus, OvelseType } from "@prisma/client";
import { statusTekst } from "@/lib/ovelseLabels";
import Avatar from "@/components/Avatar";
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

const KOLONNER: { status: OvelseStatus; farge: string }[] = [
  { status: "PLANLAGT", farge: "bg-fg-faint" },
  { status: "PAAGAAR", farge: "bg-accent-2" },
  { status: "FULLFORT", farge: "bg-accent" },
];

type Valg =
  | { type: "spill"; id: string }
  | { type: "spiller"; id: string }
  | null;

export default function KanbanBrett({
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

  // Hvilke øvelser en valgt spiller er med i (uthever kortene).
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

      {/* Detaljpanel — relevante kategorier for valgt kort eller spiller */}
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

      {/* Kanban-kolonner etter status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {KOLONNER.map((kol) => {
          const kort = spill.filter((s) => s.status === kol.status);
          return (
            <div key={kol.status}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className={cn("h-2 w-2 rounded-full", kol.farge)} />
                <h3 className="text-xs font-medium tracking-widest text-fg-dim uppercase">
                  {statusTekst[kol.status]}
                </h3>
                <span className="text-xs text-fg-faint">{kort.length}</span>
              </div>

              <div className="flex flex-col gap-2">
                {kort.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-fg-faint">
                    Ingen her
                  </div>
                )}
                {kort.map((s) => {
                  const aktiv = valg?.type === "spill" && valg.id === s.id;
                  const uthevet = spillerSpillIder?.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setValg(aktiv ? null : { type: "spill", id: s.id })
                      }
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        aktiv
                          ? "border-accent-2 bg-accent-2/10"
                          : uthevet
                            ? "border-accent-2/60 bg-white/[0.05]"
                            : "border-line bg-white/[0.03] hover:border-line-strong hover:bg-white/[0.05]"
                      )}
                    >
                      <p className="truncate font-medium text-fg">{s.navn}</p>
                      <p className="mt-0.5 truncate text-xs text-fg-faint">
                        {s.type === "LAG" ? "Lagøvelse" : "Individuell"} · Vert:{" "}
                        {s.vertNavn}
                      </p>
                      {s.kvaliteter.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.kvaliteter.map((k) => (
                            <KvalitetChip key={k} kvalitet={k} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
