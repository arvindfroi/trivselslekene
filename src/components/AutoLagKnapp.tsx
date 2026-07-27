"use client";

import { useState, useTransition } from "react";
import { autoOpprettLag } from "@/lib/actions/ovelser";

type Props = {
  ovelseId: string;
};

export default function AutoLagKnapp({ ovelseId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [suksess, setSuksess] = useState<string | null>(null);

  function handterKlikk() {
    setFeilmelding(null);
    setSuksess(null);

    startTransition(async () => {
      try {
        const resultat = await autoOpprettLag(ovelseId);
        if ("error" in resultat && resultat.error) {
          setFeilmelding(resultat.error);
        } else if ("ok" in resultat) {
          setSuksess(`${resultat.antallLag} lag opprettet automatisk!`);
        }
      } catch {
        setFeilmelding("Noe gikk galt. Prøv igjen.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handterKlikk}
          disabled={isPending}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
            isPending
              ? "cursor-not-allowed border-line bg-white/[0.02] text-fg-faint"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
          }`}
        >
          {isPending ? "Oppretter…" : "✨ Opprett alle lag automatisk"}
        </button>
      </div>
      {feilmelding && (
        <p className="mt-2 text-xs text-red-400">{feilmelding}</p>
      )}
      {suksess && (
        <p className="mt-2 text-xs text-emerald-400">{suksess}</p>
      )}
    </div>
  );
}
