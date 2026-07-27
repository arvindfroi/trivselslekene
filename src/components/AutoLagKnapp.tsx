"use client";

import { useState, useEffect, useTransition } from "react";
import { autoOpprettLag, forhandsvisLag } from "@/lib/actions/ovelser";
import type { ForhandsvisLagResultat } from "@/lib/actions/ovelser";
import { KlikkbarDeltaker } from "@/components/DeltakerProfilModal";
import { Users, AlertTriangle, Wand2 } from "lucide-react";

type Props = {
  ovelseId: string;
};

export default function AutoLagKnapp({ ovelseId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [suksess, setSuksess] = useState<string | null>(null);
  const [forhandsvisning, setForhandsvisning] = useState<ForhandsvisLagResultat | null>(null);
  const [lasterForhandsvisning, setLasterForhandsvisning] = useState(true);
  const [opprettet, setOpprettet] = useState(false);

  // Hent forhåndsvisning automatisk
  useEffect(() => {
    if (opprettet) return;

    let avbrutt = false;

    forhandsvisLag(ovelseId).then((resultat) => {
      if (avbrutt) return;
      setLasterForhandsvisning(false);
      setForhandsvisning(resultat);
      if (!resultat.ok) {
        setFeilmelding(resultat.error);
      }
    }).catch(() => {
      if (avbrutt) return;
      setLasterForhandsvisning(false);
      setFeilmelding("Kunne ikke hente forhåndsvisning.");
    });

    return () => { avbrutt = true; };
  }, [ovelseId, opprettet]);

  function handterOpprett() {
    setFeilmelding(null);
    setSuksess(null);

    startTransition(async () => {
      try {
        const resultat = await autoOpprettLag(ovelseId);
        if ("error" in resultat && resultat.error) {
          setFeilmelding(resultat.error);
        } else if ("ok" in resultat) {
          setSuksess(`${resultat.antallLag} lag opprettet automatisk!`);
          setOpprettet(true);
        }
      } catch {
        setFeilmelding("Noe gikk galt. Prøv igjen.");
      }
    });
  }

  // ─── Feil-tilstand ──────────────────────────────────────────
  if (feilmelding && !forhandsvisning?.ok) {
    return (
      <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
        {feilmelding}
      </p>
    );
  }

  // ─── Suksess (allerede opprettet) ──────────────────────────
  if (opprettet) {
    return (
      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
        {suksess}
      </p>
    );
  }

  // ─── Laster ────────────────────────────────────────────────
  if (lasterForhandsvisning) {
    return (
      <div className="flex items-center gap-2 text-xs text-fg-faint">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-fg-faint/30 border-t-fg-faint" />
        Henter lagoppsett…
      </div>
    );
  }

  // ─── Ingen data ────────────────────────────────────────────
  if (!forhandsvisning?.ok) return null;

  const { lag, overskytende, advarsel } = forhandsvisning;

  // ─── Forhåndsvisning ───────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Advarsel om overskytende spillere */}
      {advarsel && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {advarsel}
        </div>
      )}

      {/* Lag-kort */}
      <div className="grid gap-3 sm:grid-cols-2">
        {lag.map((l) => (
          <div
            key={l.navn}
            className="rounded-xl border border-line bg-white/[0.03] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <Users size={14} className="text-accent-2" />
              <h4 className="text-sm font-semibold text-fg">{l.navn}</h4>
              <span className="text-xs text-fg-faint">
                ({l.medlemmer.length} deltaker{l.medlemmer.length !== 1 ? "e" : ""})
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {l.medlemmer.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-xs">
                  <KlikkbarDeltaker userId={m.id} navn={m.navn}>
                    <span className="text-fg">{m.navn}</span>
                  </KlikkbarDeltaker>
                  <span className="tabular-nums text-fg-faint">
                    {m.poeng} p
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Overskytende (ikke plassert) */}
      {overskytende.length > 0 && (
        <div className="rounded-lg border border-line bg-white/[0.02] px-3 py-2">
          <p className="mb-1.5 text-xs text-fg-faint">
            Ikke plassert ({overskytende.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overskytende.map((s) => (
              <span
                key={s.id}
                className="rounded-full border border-line bg-white/[0.03] px-2 py-0.5 text-xs text-fg-dim"
              >
                {s.navn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Opprett-knapp + status */}
      <div className="flex items-center gap-3 border-t border-line pt-3">
        <button
          type="button"
          onClick={handterOpprett}
          disabled={isPending}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
            isPending
              ? "cursor-not-allowed border-line bg-white/[0.02] text-fg-faint"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
          }`}
        >
          {isPending ? (
            "Oppretter…"
          ) : (
            <>
              <Wand2 size={14} />
              Opprett {lag.length} lag automatisk
            </>
          )}
        </button>
        {feilmelding && (
          <p className="text-xs text-red-400">{feilmelding}</p>
        )}
      </div>
    </div>
  );
}
