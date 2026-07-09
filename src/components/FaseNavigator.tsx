"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { settAktivFase } from "@/lib/actions/ovelser";

export type FaseVisning = {
  id: string;
  rekkefolge: number;
  tittel: string | null;
  /** Liten, cachebar URL (via /api/bilde/fase/...) — ikke base64. */
  bildeSrc: string | null;
};

/**
 * Fase-navigasjon med optimistisk UI: verten ser fasebyttet UMIDDELBART,
 * mens server-oppdateringen (og revalideringen for andre deltakere) skjer i
 * bakgrunnen. Tidligere var hvert klikk en full server-rundtur før noe
 * skjedde på skjermen.
 */
export default function FaseNavigator({
  ovelseId,
  faser,
  aktivFase,
  erVert,
  fallbackBilde,
}: {
  ovelseId: string;
  faser: FaseVisning[];
  aktivFase: number;
  erVert: boolean;
  fallbackBilde: string | null;
}) {
  const [visFase, settVisFase] = useOptimistic(
    aktivFase,
    (_naavaerende, neste: number) => neste,
  );
  const [, startTransition] = useTransition();
  const totalFaser = faser.length;

  function gaaTil(fase: number) {
    const neste = Math.min(totalFaser, Math.max(0, fase));
    // Optimistisk oppdatering må skje FØR startTransition/await, ellers
    // flusher ikke React den synkront på iOS Safari og knappene responderer ikke.
    settVisFase(neste);
    startTransition(() => {
      settAktivFase(ovelseId, neste);
    });
  }

  const aktuell = visFase > 0 ? (faser[visFase - 1] ?? null) : null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Faseindikator */}
        <div className="flex items-center gap-1">
          {faser.map((f) => (
            <div
              key={f.id}
              className={`h-2 w-2 rounded-full transition-colors ${
                visFase === f.rekkefolge
                  ? "bg-accent-2"
                  : f.rekkefolge < visFase
                    ? "bg-fg-dim"
                    : "bg-line"
              }`}
            />
          ))}
        </div>
        <span className="text-sm tabular-nums text-fg-dim">
          {visFase > 0
            ? `Fase ${visFase} av ${totalFaser}`
            : `${totalFaser} faser · ikke startet`}
        </span>
        {erVert && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              className="px-3 py-2 text-xs"
              disabled={visFase <= 1}
              onClick={() => gaaTil(visFase - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="px-3 py-2 text-xs"
              disabled={visFase >= totalFaser}
              onClick={() => gaaTil(visFase + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* Vis aktuell fase */}
      {aktuell && (
        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aktuell.bildeSrc ?? fallbackBilde ?? ""}
            alt={aktuell.tittel ?? `Fase ${aktuell.rekkefolge}`}
            className="max-h-96 w-full object-contain bg-black/20"
          />
          {aktuell.tittel && (
            <div className="border-t border-line bg-white/[0.03] px-4 py-2.5">
              <p className="text-sm font-medium text-fg">{aktuell.tittel}</p>
            </div>
          )}
        </div>
      )}

      {/* Forhåndsvis alle faser (bare for vert, før start) */}
      {erVert && visFase === 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {faser.map((f) => (
            <div
              key={f.id}
              className="overflow-hidden rounded-lg border border-line bg-white/[0.02]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.bildeSrc ?? ""}
                alt={f.tittel ?? `Fase ${f.rekkefolge}`}
                loading="lazy"
                className="h-32 w-full object-cover bg-black/20"
              />
              <div className="px-2.5 py-1.5">
                <p className="text-xs font-medium text-fg">
                  {f.tittel || `Fase ${f.rekkefolge}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forhåndslast fasebildene i bakgrunnen så fasebytter føles øyeblikkelige */}
      <div aria-hidden className="hidden">
        {faser.map((f) =>
          f.bildeSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.id} src={f.bildeSrc} alt="" loading="lazy" />
          ) : null,
        )}
      </div>
    </div>
  );
}
