"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, Link2, Link2Off, X } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { lagreResultaterIndividuellMasse } from "@/lib/actions/ovelser";
import type { OvelseStatus } from "@prisma/client";
import { autoLagreTekst, useAutoLagre } from "@/lib/useAutoLagre";
import { STANDARD_POENG, beregnPlasseringer, standardPoengFor } from "@/lib/rangering";

interface DeltakerRad {
  key: string;
  userId: string;
  navn: string;
  bonusPoeng: number;
  /** true = deler plassering med raden over (lik plassering) */
  delPlass: boolean;
}

interface Props {
  ovelseId: string;
  status: OvelseStatus;
  eksisterende: {
    id: string;
    userId: string;
    plassering: number | null;
    poeng: number;
    bonusPoeng: number;
    user: { id: string; navn: string };
  }[];
  alleDeltakere: { id: string; navn: string }[];
}

export default function RankingRedigering({
  ovelseId,
  status,
  eksisterende,
  alleDeltakere,
}: Props) {
  const laast = status === "FULLFORT";
  // Bygg initiell rad-liste fra eksisterende resultater (sortert på plassering)
  const sorted = [...eksisterende].sort((a, b) => {
    const pa = a.plassering ?? 999;
    const pb = b.plassering ?? 999;
    return pa - pb;
  });

  // Detekter eksisterende ties: hvis to naborader har samme plassering,
  // sett delPlass=true på den andre (og evt. påfølgende)
  function byggInitielleRader(): DeltakerRad[] {
    return sorted.map((r, i) => ({
      key: `r-${r.userId}`,
      userId: r.userId,
      navn: r.user.navn,
      bonusPoeng: r.bonusPoeng ?? 0,
      delPlass:
        i > 0 &&
        r.plassering !== null &&
        sorted[i - 1].plassering !== null &&
        r.plassering === sorted[i - 1].plassering,
    }));
  }

  const [rader, setRader] = useState<DeltakerRad[]>(byggInitielleRader);

  // Auto-lagring: hver endring (rekkefølge, bonus, legg til/fjern) lagres
  // automatisk kort tid etter siste endring — ingen Lagre-knapp.
  const lagreStatus = useAutoLagre(
    rader,
    async (r) => {
      const delPlassFlags = r.map((rad) => rad.delPlass);
      const plasseringer = beregnPlasseringer(delPlassFlags);

      const resultater = r.map((rad, i) => {
        const { plassering, poengPlassering } = plasseringer[i];
        const stdPoeng = standardPoengFor(poengPlassering);
        return {
          userId: rad.userId,
          plassering,
          poeng: stdPoeng + rad.bonusPoeng,
          bonusPoeng: rad.bonusPoeng,
        };
      });
      await lagreResultaterIndividuellMasse(ovelseId, resultater);
    },
    { aktiv: rader.length > 0 && !laast },
  );

  // Finn brukere som ikke allerede er i listen
  const radIder = new Set(rader.map((r) => r.userId));
  const ledigeDeltakere = alleDeltakere.filter((d) => !radIder.has(d.id));

  // ─── Handlere ──────────────────────────────────────────────────────────

  function handleReorder(ny: DeltakerRad[]) {
    setRader(ny);
  }

  function leggTil(userId: string) {
    const deltaker = alleDeltakere.find((d) => d.id === userId);
    if (!deltaker) return;
    setRader((prev) => [
      ...prev,
      {
        key: `r-${userId}-${Date.now()}`,
        userId,
        navn: deltaker.navn,
        bonusPoeng: 0,
        delPlass: false,
      },
    ]);
  }

  function fjernRad(index: number) {
    setRader((prev) => prev.filter((_, i) => i !== index));
  }

  function settBonusPoeng(index: number, verdi: number) {
    setRader((prev) =>
      prev.map((r, i) => (i === index ? { ...r, bonusPoeng: verdi } : r)),
    );
  }

  function toggleDelPlass(index: number) {
    setRader((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, delPlass: !r.delPlass } : r,
      ),
    );
  }

  function leggTilAlle() {
    const nye = ledigeDeltakere.map((d) => ({
      key: `r-${d.id}-${Date.now() + Math.random()}`,
      userId: d.id,
      navn: d.navn,
      bonusPoeng: 0,
      delPlass: false,
    }));
    setRader((prev) => [...prev, ...nye]);
  }

  function fjernAlle() {
    setRader([]);
  }

  // ─── Beregn plasseringer for visning ──────────────────────────────────

  const delPlassFlags = rader.map((r) => r.delPlass);
  const plasseringer = beregnPlasseringer(delPlassFlags);

  // Finn hvilke rader som er del av en tie-gruppe (for visuell bracketing)
  const erITie = rader.map((_, i) => {
    if (i > 0 && rader[i].delPlass) return true;
    if (i < rader.length - 1 && rader[i + 1].delPlass) return true;
    return false;
  });

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="mt-6">
      {laast && (
        <p className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
          Denne leken er fullført — resultatene er låst.
        </p>
      )}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium tracking-widest text-fg-dim uppercase">
          Ranger deltakere
        </h2>
        <span
          aria-live="polite"
          className={`text-xs ${
            lagreStatus === "feil"
              ? "text-red-400"
              : lagreStatus === "lagret"
                ? "text-accent-2"
                : "text-fg-faint"
          }`}
        >
          {autoLagreTekst(lagreStatus)}
        </span>
      </div>

      {/* Rad-liste med drag-and-drop */}
      {rader.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-dim">
          Ingen deltakere lagt til ennå
        </p>
      ) : (
        <Reorder.Group
          axis="y"
          values={rader}
          onReorder={laast ? () => {} : handleReorder}
          className="flex flex-col"
        >
          {rader.map((rad, i) => {
            const plass = plasseringer[i].plassering;
            const stdPoeng = standardPoengFor(plasseringer[i].poengPlassering);
            const iTie = erITie[i];
            const erTieStart =
              i < rader.length - 1 && rader[i + 1].delPlass;
            const erTieMidt = i > 0 && rader[i].delPlass;
            const erTieSlutt =
              i > 0 &&
              rader[i].delPlass &&
              (i === rader.length - 1 || !rader[i + 1]?.delPlass);

            return (
              <Reorder.Item
                key={rad.key}
                value={rad}
                whileDrag={{
                  zIndex: 50,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  scale: 1.02,
                }}
                className={`flex items-center gap-2 border-line select-none touch-none ${
                  // Visuell bracketing: tie-grupper har left-border
                  iTie
                    ? "border-l-2 border-l-accent-2/40 bg-accent-2/[0.03]"
                    : "border-l-2 border-l-transparent"
                } ${
                  // Runde hjørner for første/siste i tie-gruppe
                  erTieStart ? "rounded-tl-md pt-3" : ""
                } ${
                  erTieSlutt ? "rounded-bl-md pb-3" : ""
                } ${
                  // Mellomrom mellom grupper
                  !iTie && i > 0 && erITie[i - 1] ? "mt-2" : ""
                } ${
                  !iTie ? "py-2" : erTieMidt ? "py-0.5" : "py-2"
                }`}
                style={{ cursor: laast ? "default" : "grab" }}
              >
                {/* Drag-håndtak */}
                <div className="flex shrink-0 items-center justify-center w-8 h-11 text-fg-faint">
                  <GripVertical size={18} />
                </div>

                {/* Plassering */}
                <span className="w-7 shrink-0 text-center text-sm tabular-nums text-accent-2 font-medium">
                  {plass}.
                </span>

                {/* Navn */}
                <span className="flex-1 min-w-0 text-sm text-fg truncate">
                  {rad.navn}
                </span>

                {/* Standard poeng (auto) */}
                <div className="shrink-0 w-12 text-right">
                  <span className="text-sm tabular-nums text-fg-dim">
                    {stdPoeng}
                  </span>
                </div>

                {/* Bonus poeng */}
                <div className="shrink-0 w-16">
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    value={rad.bonusPoeng || ""}
                    onChange={(e) =>
                      settBonusPoeng(
                        i,
                        e.target.value === "" ? 0 : Number(e.target.value),
                      )
                    }
                    className="h-9 px-1.5 text-xs text-center"
                    aria-label={`Bonuspoeng for ${rad.navn}`}
                    placeholder="0"
                    disabled={laast}
                  />
                </div>

                {/* Total */}
                <span className="shrink-0 w-11 text-right text-sm tabular-nums text-fg font-medium">
                  {stdPoeng + rad.bonusPoeng}
                </span>

                {/* Del plass-knapp (kun fra 2. rad og utover) */}
                {i > 0 ? (
                  <button
                    type="button"
                    onClick={() => toggleDelPlass(i)}
                    disabled={laast}
                    className={`shrink-0 flex items-center justify-center w-8 h-8 transition-colors ${
                      laast
                        ? "text-fg-faint/40 cursor-not-allowed"
                        : rad.delPlass
                          ? "text-accent-2 hover:text-accent-2/70"
                          : "text-fg-faint hover:text-fg-dim"
                    }`}
                    aria-label={
                      rad.delPlass
                        ? `Løs opp delt plass med ${rader[i - 1].navn}`
                        : `Del plassering med ${rader[i - 1].navn}`
                    }
                    title={
                      rad.delPlass
                        ? "Klikk for å skille plasseringer"
                        : "Klikk for å dele plassering med over"
                    }
                  >
                    {rad.delPlass ? (
                      <Link2 size={15} strokeWidth={2.5} />
                    ) : (
                      <Link2Off size={15} strokeWidth={2} />
                    )}
                  </button>
                ) : (
                  <div className="w-8" />
                )}

                {/* Fjern */}
                <button
                  type="button"
                  onClick={() => fjernRad(i)}
                  disabled={laast}
                  className={`shrink-0 flex items-center justify-center w-8 h-8 transition-colors ${
                    laast
                      ? "text-fg-faint/40 cursor-not-allowed"
                      : "text-fg-faint hover:text-red-300"
                  }`}
                  aria-label={`Fjern ${rad.navn}`}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}

      {/* Kolonne-headere (kun når det er rader) */}
      {rader.length > 0 && (
        <div className="mt-1 flex items-center gap-2 px-10 text-[10px] text-fg-faint">
          <span className="w-7 text-center">#</span>
          <span className="flex-1">Navn</span>
          <span className="w-12 text-right">Std</span>
          <span className="w-16 text-center">Bonus</span>
          <span className="w-11 text-right">Sum</span>
          <span className="w-8 text-center" title="Del plassering">
            Del
          </span>
          <span className="w-8" />
        </div>
      )}

      {/* Legg til deltaker */}
      {!laast && ledigeDeltakere.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-fg-faint">
              {rader.length} av {rader.length + ledigeDeltakere.length} lagt til
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={leggTilAlle}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent-2/10"
              >
                Alle
              </button>
              {rader.length > 0 && (
                <button
                  type="button"
                  onClick={fjernAlle}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-dim transition-colors hover:bg-white/[0.06]"
                >
                  Ingen
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  leggTil(e.target.value);
                  e.target.value = "";
                }
              }}
              className="flex-1 min-h-[44px] rounded-xl border border-line bg-white/[0.05] px-4 py-3 text-sm text-fg appearance-none"
              aria-label="Legg til deltaker"
            >
              <option value="">+ Legg til deltaker</option>
              {ledigeDeltakere.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.navn}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Poeng-forklaring */}
      <p className="mt-4 text-center text-[10px] leading-relaxed text-fg-faint">
        Poeng = standard ({STANDARD_POENG.slice(0, 3).join(", ")}, …) + bonus.
        Trykk på lenke-ikonet <Link2 size={11} className="inline align-text-bottom" /> for
        å la to deltakere dele plassering (uavgjort). Da deler de den laveste
        poengsummen — deler du 1. og 2. plass, får begge {STANDARD_POENG[1]} poeng.
        Endringer lagres automatisk.
      </p>
    </div>
  );
}
