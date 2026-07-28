"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { slettBruker } from "@/lib/actions/admin";

/**
 * Slett-knapp med bekreftelse i to steg. Sletting av en bruker river med seg
 * lekene hen er vert for, så det skal ikke kunne skje på ett uhell-trykk.
 */
export default function SlettBrukerKnapp({
  userId,
  navn,
  antallLeker,
  erDegSelv,
}: {
  userId: string;
  navn: string;
  antallLeker: number;
  erDegSelv: boolean;
}) {
  const [bekrefter, setBekrefter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (erDegSelv) {
    return <span className="text-xs text-fg-faint">Deg selv</span>;
  }

  function slett() {
    setFeil(null);
    startTransition(async () => {
      const svar = await slettBruker(userId);
      if (svar && !svar.ok) {
        setFeil(svar.feil ?? "Klarte ikke å slette brukeren.");
        setBekrefter(false);
      }
      // Ved suksess forsvinner raden når serveren revalidere /admin.
    });
  }

  if (!bekrefter) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="danger"
          className="px-3 py-1.5 text-xs"
          onClick={() => setBekrefter(true)}
        >
          <Trash2 size={14} /> Slett
        </Button>
        {feil && <span className="text-xs text-red-300">{feil}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-xs text-fg-dim">
        Slette {navn}
        {antallLeker > 0 &&
          ` og ${antallLeker} ${antallLeker === 1 ? "lek" : "leker"} hen er vert for`}
        ? Kan ikke angres.
      </span>
      <div className="flex gap-2">
        <Button
          variant="danger"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={slett}
        >
          {pending ? "Sletter…" : "Ja, slett"}
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={() => setBekrefter(false)}
        >
          Avbryt
        </Button>
      </div>
      {feil && <span className="text-xs text-red-300">{feil}</span>}
    </div>
  );
}
