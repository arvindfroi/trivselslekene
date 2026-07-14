"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, MapPin, Trash2, Trophy, Users } from "lucide-react";
import type { Kvalitet, OvelseStatus, OvelseType } from "@prisma/client";
import { kvalitetIkon, statusTekst, statusVariant } from "@/lib/ovelseLabels";
import { antallFyllCeller, BENTO_GRID, bentoSpenn } from "@/lib/bento";
import { slettOvelse, nesteOvelseStatus } from "@/lib/actions/ovelser";
import { slettTurnering } from "@/lib/actions/turnering";
import Avatar from "@/components/Avatar";
import Badge from "@/components/ui/Badge";
import SubmitButton from "@/components/ui/SubmitButton";
import KvalitetChip from "@/components/KvalitetChip";
import { cn } from "@/lib/utils";

export type SpillKort = {
  id: string;
  navn: string;
  status: OvelseStatus;
  type: OvelseType;
  vertNavn: string;
  vertId: string;
  vertFarge: string | null;
  lokasjon: string | null;
  fellesLek: boolean;
  kvaliteter: Kvalitet[];
  deltakere: { id: string; navn: string }[];
  turneringId?: string | null;
};

export default function OvelseGrid({
  spill,
  currentUserId,
}: {
  spill: SpillKort[];
  currentUserId: string;
}) {
  const [apen, setApen] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Regner ut spennet hver flis faktisk bruker akkurat nå (inkludert den
  // som ev. er utvidet), slik at vi kan fylle ut resten av gridet med
  // usynlige celler og garantere at mosaikken alltid danner et rektangel.
  const spennPerFlis = spill.map((s, i) =>
    apen === s.id ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : bentoSpenn(i)
  );
  const fyllCeller = antallFyllCeller(spennPerFlis);

  return (
    <div className={BENTO_GRID}>
      {spill.map((s, i) => {
        const er = apen === s.id;
        const grunn = bentoSpenn(i);
        const spenn = spennPerFlis[i];
        const hero =
          !er && grunn.includes("col-span-2") && grunn.includes("row-span-2");

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setApen(er ? null : s.id)}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300",
              spenn,
              er
                ? "z-10 bg-bg-elev shadow-lg shadow-black/20"
                : "surface hover:border-line-strong hover:bg-bg-elev-2"
            )}
            style={
              s.vertFarge
                ? er
                  ? { borderColor: s.vertFarge }
                  : {
                      backgroundColor: s.vertFarge,
                      borderColor: s.vertFarge,
                    }
                : er
                  ? { borderColor: undefined }
                  : undefined
            }
          >
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  "font-display leading-tight text-fg inline-flex items-center gap-1.5",
                  hero ? "text-2xl" : "text-lg"
                )}
              >
                {s.type === "TURNERING" && <Trophy size={hero ? 20 : 16} className="text-accent-2 shrink-0" />}
                {s.navn}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {er ? (
                  s.vertId === currentUserId ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(async () => {
                          await nesteOvelseStatus(s.id);
                        });
                      }}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium tracking-wide uppercase transition-opacity disabled:opacity-50"
                      style={{
                        borderColor:
                          s.status === "PAAGAAR"
                            ? "var(--color-accent-3)"
                            : s.status === "FULLFORT"
                              ? "var(--color-emerald-500)"
                              : "var(--color-line)",
                        color:
                          s.status === "PAAGAAR"
                            ? "var(--color-accent-3)"
                            : s.status === "FULLFORT"
                              ? "var(--color-emerald-300)"
                              : "var(--color-fg-dim)",
                        backgroundColor:
                          s.status === "PAAGAAR"
                            ? "rgb(var(--color-accent-3) / 0.1)"
                            : s.status === "FULLFORT"
                              ? "rgb(var(--color-emerald-500) / 0.1)"
                              : "rgb(255 255 255 / 0.06)",
                      }}
                      title="Klikk for å bytte status"
                    >
                      {s.status === "PAAGAAR" && (
                        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
                      )}
                      {statusTekst[s.status]}
                    </button>
                  ) : (
                    <Badge
                      variant={statusVariant[s.status]}
                      pulse={s.status === "PAAGAAR"}
                    >
                      {statusTekst[s.status]}
                    </Badge>
                  )
                ) : s.vertId === currentUserId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startTransition(async () => {
                        await nesteOvelseStatus(s.id);
                      });
                    }}
                    disabled={isPending}
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full border transition-opacity disabled:opacity-50",
                      s.status === "PAAGAAR" &&
                        "animate-pulse-dot border-accent-3/40 bg-accent-3",
                      s.status === "FULLFORT" &&
                        "border-emerald-500/40 bg-emerald-400",
                      s.status === "PLANLAGT" &&
                        "border-line bg-fg-dim"
                    )}
                    aria-label={`${statusTekst[s.status]} — klikk for å bytte`}
                    title="Klikk for å bytte status"
                  />
                ) : (
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full border",
                      s.status === "PAAGAAR" &&
                        "animate-pulse-dot border-accent-3/40 bg-accent-3",
                      s.status === "FULLFORT" &&
                        "border-emerald-500/40 bg-emerald-400",
                      s.status === "PLANLAGT" &&
                        "border-line bg-fg-dim"
                    )}
                    aria-label={statusTekst[s.status]}
                  />
                )}
                <span
                  className="transition-transform duration-300"
                  style={{
                    transform: er ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <ChevronDown size={16} className="text-fg-faint" />
                </span>
              </div>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-faint">
              <span>{s.type === "LAG" ? "Laglek" : s.type === "TURNERING" ? "Turnering" : "Individuell"}</span>
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

            {/* Kollapset: kompakt ikon-rad for egenskapene */}
            {!er && s.kvaliteter.length > 0 && (
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                {s.kvaliteter.slice(0, hero ? 8 : 4).map((k) => {
                  const Ikon = kvalitetIkon[k];
                  return (
                    <Ikon
                      key={k}
                      size={15}
                      className="text-accent-2"
                      aria-label={k}
                    />
                  );
                })}
                {s.kvaliteter.length > (hero ? 8 : 4) && (
                  <span className="text-[11px] text-fg-faint">
                    +{s.kvaliteter.length - (hero ? 8 : 4)}
                  </span>
                )}
              </div>
            )}

            {/* Utvidet: height-animert detalj */}
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                er ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-[11px] tracking-widest text-fg-faint uppercase">
                    Egenskaper leken tester
                  </p>
                  {s.kvaliteter.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.kvaliteter.map((k) => (
                        <KvalitetChip key={k} kvalitet={k} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-fg-faint">
                      Ingen egenskaper valgt.
                    </p>
                  )}

                  {s.deltakere.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                  )}

                  <Link
                    href={s.type === "TURNERING" ? "/turnering" : `/ovelser/${s.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-accent-2 hover:text-fg active:bg-white/5 min-h-[44px]"
                  >
                    Se mer <ArrowRight size={14} />
                  </Link>

                  {s.vertId === currentUserId && (
                    <form
                      action={
                        s.type === "TURNERING" && s.turneringId
                          ? slettTurnering.bind(null, s.turneringId)
                          : slettOvelse.bind(null, s.id)
                      }
                      className="mt-2"
                      onSubmit={(e) => e.stopPropagation()}
                    >
                      <SubmitButton
                        variant="danger"
                        className="px-3 py-2 text-xs"
                        pendingText="Sletter…"
                      >
                        <Trash2 size={14} /> Slett {s.type === "TURNERING" ? "turnering" : "lek"}
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
      {Array.from({ length: fyllCeller }).map((_, i) => (
        <div key={`fyll-${i}`} aria-hidden="true" className="hidden sm:block" />
      ))}
    </div>
  );
}
