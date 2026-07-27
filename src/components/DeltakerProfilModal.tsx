"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { kvalitetIkon, kvalitetTekst } from "@/lib/ovelseLabels";
import { cn } from "@/lib/utils";
import type { DeltakerInfo } from "@/lib/actions/deltaker";

/**
 * Klikkbar wrapper som gjør en deltaker klikkbar. Ved klikk åpnes
 * DeltakerProfilModal med full info om deltakeren.
 *
 * Brukes slik:
 * <KlikkbarDeltaker userId={id} navn={navn} bildeUrl={url} farge={farge}>
 *   <Avatar navn={navn} ... />
 *   <span>{navn}</span>
 * </KlikkbarDeltaker>
 */
export function KlikkbarDeltaker({
  userId,
  navn,
  bildeUrl,
  farge,
  children,
  className,
}: {
  userId: string;
  navn: string;
  bildeUrl?: string | null;
  farge?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const [apen, setApen] = useState(false);

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setApen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            setApen(true);
          }
        }}
        className={cn(
          "cursor-pointer transition-opacity hover:opacity-80",
          className,
        )}
      >
        {children}
      </span>
      {apen && (
        <DeltakerProfilModal
          userId={userId}
          navn={navn}
          bildeUrl={bildeUrl}
          farge={farge}
          onClose={() => setApen(false)}
        />
      )}
    </>
  );
}

/**
 * Modal som viser en deltakers profilbilde stort + statistikk.
 * Følger samme mønster som StatFlis sin modal.
 */
export default function DeltakerProfilModal({
  userId,
  navn,
  bildeUrl,
  farge,
  onClose,
}: {
  userId: string;
  navn: string;
  bildeUrl?: string | null;
  farge?: string | null;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<DeltakerInfo | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  const lastInfo = useCallback(async () => {
    try {
      setFeil(null);
      const { hentDeltakerInfo } = await import("@/lib/actions/deltaker");
      const data = await hentDeltakerInfo(userId);
      setInfo(data);
    } catch {
      setFeil("Kunne ikke hente deltakerinfo.");
    }
  }, [userId]);

  useEffect(() => {
    lastInfo();
  }, [lastInfo]);

  useEffect(() => {
    const luk = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", luk);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", luk);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="animate-fade-up fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface animate-page-enter max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Profil for ${navn}`}
      >
        {/* Lukk-knapp */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              navn={navn}
              bildeUrl={bildeUrl}
              farge={farge}
              size={56}
            />
            <div>
              <p className="font-display text-lg text-fg">{navn}</p>
              {info && (
                <p className="text-sm text-fg-dim tabular-nums">
                  {info.totalPoeng} poeng · {info.antallLeker}{" "}
                  {info.antallLeker === 1 ? "lek" : "leker"}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="shrink-0 rounded-full p-2 text-fg-faint hover:bg-white/5 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Innhold */}
        <div className="mt-5 border-t border-line pt-4">
          {feil ? (
            <p className="text-sm text-red-400">{feil}</p>
          ) : !info ? (
            <p className="text-sm text-fg-dim">Laster…</p>
          ) : (
            <>
              {/* Mini-statistikk */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat label="Leker" verdi={String(info.antallLeker)} />
                <MiniStat label="Seire" verdi={String(info.seire)} />
                <MiniStat
                  label="Snitt"
                  verdi={info.antallLeker ? info.snitt.toFixed(1) : "–"}
                />
                <MiniStat label="Rekord" verdi={String(info.rekord)} />
              </div>

              {/* Sterkest i */}
              <p className="mt-4 text-[11px] tracking-widest text-fg-faint uppercase">
                Sterkest i
              </p>
              {info.kvaliteter.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {info.kvaliteter.map(({ kvalitet, poeng }) => {
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
