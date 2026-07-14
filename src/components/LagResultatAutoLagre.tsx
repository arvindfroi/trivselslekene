"use client";

import { useMemo, useState } from "react";
import { Input, Label } from "@/components/ui/Field";
import { autoLagreTekst, useAutoLagre } from "@/lib/useAutoLagre";

type Props = {
  lagId: string;
  plassering: number | null;
  poeng: number | null;
  lagre: (formData: FormData) => Promise<void>;
};

/**
 * Plassering/poeng for et lag med auto-lagring: feltene lagres kort tid
 * etter siste tastetrykk, uten Lagre-knapp. Lagring skjer først når poeng
 * er utfylt (samme krav som det gamle skjemaet).
 */
export default function LagResultatAutoLagre({
  lagId,
  plassering,
  poeng,
  lagre,
}: Props) {
  const [plasseringVerdi, setPlasseringVerdi] = useState(
    plassering !== null ? String(plassering) : "",
  );
  const [poengVerdi, setPoengVerdi] = useState(
    poeng !== null ? String(poeng) : "",
  );

  const verdi = useMemo(
    () => ({ plassering: plasseringVerdi, poeng: poengVerdi }),
    [plasseringVerdi, poengVerdi],
  );

  const status = useAutoLagre(
    verdi,
    async (v) => {
      const formData = new FormData();
      formData.set("plassering", v.plassering);
      formData.set("poeng", v.poeng);
      await lagre(formData);
    },
    { aktiv: poengVerdi.trim() !== "" && !Number.isNaN(Number(poengVerdi)) },
  );

  return (
    <div className="flex items-end gap-2">
      <div className="w-20">
        <Label htmlFor={`plassering-${lagId}`}>Plass.</Label>
        <Input
          id={`plassering-${lagId}`}
          type="number"
          min={1}
          value={plasseringVerdi}
          onChange={(e) => setPlasseringVerdi(e.target.value)}
        />
      </div>
      <div className="w-24">
        <Label htmlFor={`poeng-${lagId}`}>Poeng</Label>
        <Input
          id={`poeng-${lagId}`}
          type="number"
          step="0.5"
          value={poengVerdi}
          onChange={(e) => setPoengVerdi(e.target.value)}
        />
      </div>
      <span
        aria-live="polite"
        className={`pb-2.5 text-xs whitespace-nowrap ${
          status === "feil"
            ? "text-red-400"
            : status === "lagret"
              ? "text-accent-2"
              : "text-fg-faint"
        }`}
      >
        {autoLagreTekst(status)}
      </span>
    </div>
  );
}
