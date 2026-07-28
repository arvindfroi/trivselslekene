"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default function NullstillKnapp() {
  const [bekrefter, setBekrefter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function nullstill() {
    setFeil(null);
    setOk(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/nullstill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "nullstill-for-lekene-2026-midlg",
            bekreft: "NULLSTILL",
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          setFeil(data.feil ?? "Klarte ikke å nullstille.");
          setBekrefter(false);
        } else {
          setOk(true);
          setBekrefter(false);
        }
      } catch {
        setFeil("Nettverksfeil — prøv igjen.");
        setBekrefter(false);
      }
    });
  }

  if (ok) {
    return (
      <div className="mt-4 p-4 surface rounded-xl border border-green-500/30">
        <p className="text-sm text-green-400 font-medium">
          ✅ Testdata er slettet. Last siden på nytt for å se endringene.
        </p>
      </div>
    );
  }

  if (!bekrefter) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="danger"
          className="px-3 py-1.5 text-xs"
          onClick={() => setBekrefter(true)}
        >
          <Trash2 size={14} /> Slett testdata
        </Button>
        {feil && <span className="text-xs text-red-300">{feil}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-xs text-fg-dim">
        Dette sletter ALLE brukere, leker, turneringer, lag og resultater.
        Sesongene beholdes. Kan ikke angres.
      </span>
      <div className="flex gap-2">
        <Button
          variant="danger"
          className="px-3 py-1.5 text-xs"
          disabled={pending}
          onClick={nullstill}
        >
          {pending ? "Sletter…" : "Ja, slett alt"}
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
