"use client";

import { useState, useCallback, useTransition } from "react";
import { motion } from "framer-motion";
import { GripVertical, X, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { lagreResultaterIndividuellMasse } from "@/lib/actions/ovelser";

// Standard poeng for plassering 1–8+. Utover 8. plass = 0 poeng.
const STANDARD_POENG = [10, 8, 6, 5, 4, 3, 2, 1];

function standardPoengFor(plass: number): number {
  if (plass < 1) return 0;
  const idx = plass - 1;
  return idx < STANDARD_POENG.length ? STANDARD_POENG[idx] : 0;
}

interface DeltakerRad {
  key: string;
  userId: string;
  navn: string;
  bonusPoeng: number;
}

interface Props {
  ovelseId: string;
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
  eksisterende,
  alleDeltakere,
}: Props) {
  // Bygg initiell rad-liste fra eksisterende resultater (sortert på plassering)
  const sorted = [...eksisterende].sort((a, b) => {
    const pa = a.plassering ?? 999;
    const pb = b.plassering ?? 999;
    return pa - pb;
  });

  const [rader, setRader] = useState<DeltakerRad[]>(
    sorted.map((r) => ({
      key: `r-${r.userId}`,
      userId: r.userId,
      navn: r.user.navn,
      bonusPoeng: r.bonusPoeng ?? 0,
    })),
  );

  const [isPending, startTransition] = useTransition();

  // Finn brukere som ikke allerede er i listen
  const radIder = new Set(rader.map((r) => r.userId));
  const ledigeDeltakere = alleDeltakere.filter((d) => !radIder.has(d.id));

  // ─── Handlere ──────────────────────────────────────────────────────────

  const flyttRad = useCallback(
    (fra: number, til: number) => {
      if (fra === til) return;
      const ny = [...rader];
      const [flyttet] = ny.splice(fra, 1);
      ny.splice(til, 0, flyttet);
      setRader(ny);
    },
    [rader],
  );

  const handleDragEnd = useCallback(
    (index: number, _: unknown, info: { offset: { y: number } }) => {
      const ROW_H = 52; // omtrentlig radhøyde i px
      const delta = Math.round(info.offset.y / ROW_H);
      const nyIndex = Math.max(0, Math.min(rader.length - 1, index + delta));
      flyttRad(index, nyIndex);
    },
    [rader.length, flyttRad],
  );

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

  function handleLagre() {
    const resultater = rader.map((r, i) => {
      const plassering = i + 1;
      const stdPoeng = standardPoengFor(plassering);
      return {
        userId: r.userId,
        plassering,
        poeng: stdPoeng + r.bonusPoeng,
        bonusPoeng: r.bonusPoeng,
      };
    });

    startTransition(async () => {
      await lagreResultaterIndividuellMasse(ovelseId, resultater);
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-sm font-medium tracking-widest text-fg-dim uppercase">
        Ranger deltakere
      </h2>

      {/* Rad-liste med drag-and-drop */}
      {rader.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-dim">
          Ingen deltakere lagt til ennå
        </p>
      ) : (
        <ul className="flex flex-col">
          {rader.map((rad, i) => {
            const stdPoeng = standardPoengFor(i + 1);
            return (
              <motion.li
                key={rad.key}
                drag="y"
                dragElastic={0}
                dragMomentum={false}
                onDragEnd={(_, info) => handleDragEnd(i, _, info)}
                whileDrag={{
                  zIndex: 50,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  scale: 1.02,
                }}
                className="flex items-center gap-2 border-b border-line py-2 select-none touch-none"
                style={{ cursor: "grab" }}
              >
                {/* Drag-håndtak */}
                <div className="flex shrink-0 items-center justify-center w-8 h-11 text-fg-faint">
                  <GripVertical size={18} />
                </div>

                {/* Plassering */}
                <span className="w-7 shrink-0 text-center text-sm tabular-nums text-accent-2 font-medium">
                  {i + 1}.
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
                  />
                </div>

                {/* Total */}
                <span className="shrink-0 w-11 text-right text-sm tabular-nums text-fg font-medium">
                  {stdPoeng + rad.bonusPoeng}
                </span>

                {/* Fjern */}
                <button
                  type="button"
                  onClick={() => fjernRad(i)}
                  className="shrink-0 flex items-center justify-center w-8 h-8 text-fg-faint hover:text-red-300 transition-colors"
                  aria-label={`Fjern ${rad.navn}`}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {/* Kolonne-headere (kun når det er rader) */}
      {rader.length > 0 && (
        <div className="mt-1 flex items-center gap-2 px-10 text-[10px] text-fg-faint">
          <span className="w-7 text-center">#</span>
          <span className="flex-1">Navn</span>
          <span className="w-12 text-right">Std</span>
          <span className="w-16 text-center">Bonus</span>
          <span className="w-11 text-right">Sum</span>
          <span className="w-8" />
        </div>
      )}

      {/* Legg til deltaker */}
      {ledigeDeltakere.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
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
      )}

      {/* Lagre-knapp */}
      <div className="mt-6">
        <Button
          type="button"
          onClick={handleLagre}
          disabled={rader.length === 0 || isPending}
          className="w-full"
        >
          {isPending ? (
            "Lagrer…"
          ) : (
            <>
              <Save size={16} />
              Lagre resultater
            </>
          )}
        </Button>
      </div>

      {/* Poeng-forklaring */}
      <p className="mt-2 text-center text-[10px] text-fg-faint">
        Poeng = standard ({STANDARD_POENG.slice(0, 3).join(", ")}, …) + bonus.
        Trykk på Lagre for å registrere.
      </p>
    </div>
  );
}
