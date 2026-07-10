"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

export type FlisPerson = {
  navn: string;
  bildeUrl: string | null;
  verdi: string;
};

/**
 * Én flis i en bento-mosaikk: ikon, tittel og lederen på topp.
 * Klikk åpner et modalvindu med full rangering og forklaring — flisen
 * selv endrer aldri størrelse, så mosaikkens rektangulære form er
 * uavhengig av hva brukeren har åpnet.
 *
 * Ikonet sendes inn ferdig rendret (ikke som komponentreferanse) fordi
 * dette er en klientkomponent — en rå Lucide-komponent kan ikke
 * serialiseres over server/klient-grensen.
 */
export default function StatFlis({
  ikonKort,
  ikonModal,
  tittel,
  tekst,
  forklaring,
  leder,
  alle,
  stor = false,
  className,
}: {
  ikonKort: ReactNode;
  ikonModal: ReactNode;
  tittel: string;
  tekst?: string;
  forklaring: string;
  leder: FlisPerson | null;
  alle: FlisPerson[];
  stor?: boolean;
  className?: string;
}) {
  const [apen, setApen] = useState(false);

  useEffect(() => {
    if (!apen) return;
    const luk = (e: KeyboardEvent) => e.key === "Escape" && setApen(false);
    document.addEventListener("keydown", luk);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", luk);
      document.body.style.overflow = "";
    };
  }, [apen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setApen(true)}
        className={cn(
          "surface flex cursor-pointer flex-col overflow-hidden rounded-2xl p-4 text-left transition-colors hover:border-line-strong",
          className
        )}
      >
        <span
          className={cn(
            "bg-accent flex shrink-0 items-center justify-center rounded-xl text-white",
            stor ? "h-14 w-14" : "h-10 w-10"
          )}
        >
          {ikonKort}
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
              <Avatar navn={leder.navn} bildeUrl={leder.bildeUrl} size={stor ? 28 : 22} />
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
      </button>

      {apen && (
        <div
          className="animate-fade-up fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setApen(false)}
        >
          <div
            className="surface animate-page-enter max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={tittel}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                  {ikonModal}
                </span>
                <div>
                  <p className="font-display text-lg text-fg">{tittel}</p>
                  {tekst && <p className="text-xs text-fg-faint">{tekst}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApen(false)}
                aria-label="Lukk"
                className="shrink-0 rounded-full p-2 text-fg-faint hover:bg-white/5 hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-4 border-t border-line pt-4 text-sm text-fg-dim">
              {forklaring}
            </p>

            <p className="mt-4 text-[11px] tracking-widest text-fg-faint uppercase">
              Full rangering
            </p>
            {alle.length > 0 ? (
              <div className="mt-2 flex flex-col gap-1.5">
                {alle.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-5 shrink-0 text-center text-xs text-fg-faint tabular-nums">
                      {i + 1}
                    </span>
                    <Avatar navn={p.navn} bildeUrl={p.bildeUrl} size={24} />
                    <span className="truncate text-sm font-medium text-fg">
                      {p.navn}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-fg-dim tabular-nums">
                      {p.verdi}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-fg-faint">Ingen resultater registrert ennå.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
