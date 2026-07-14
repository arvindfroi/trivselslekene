"use client";

import { useEffect, useRef, useState } from "react";

export type AutoLagreStatus = "inaktiv" | "venter" | "lagrer" | "lagret" | "feil";

/**
 * Debounced auto-lagring: kaller `lagre` en stund etter siste endring i
 * `verdi`, og aldri med flere kall i flukt samtidig — kommer det nye
 * endringer mens en lagring pågår, lagres siste verdi på nytt etterpå.
 * Første render (initielle data fra serveren) utløser ingen lagring.
 *
 * NB: `verdi` må få ny identitet ved endring (ny array/objekt), ellers
 * fanges ikke endringen opp.
 */
export function useAutoLagre<T>(
  verdi: T,
  lagre: (verdi: T) => Promise<void>,
  { forsinkelseMs = 1000, aktiv = true }: { forsinkelseMs?: number; aktiv?: boolean } = {},
): AutoLagreStatus {
  const [status, setStatus] = useState<AutoLagreStatus>("inaktiv");

  // Refs så timeouten alltid ser siste verdi/callback uten å restarte
  // debounce-effekten. Synkes i egen effect (kjører før effekten under).
  const verdiRef = useRef(verdi);
  const lagreRef = useRef(lagre);
  useEffect(() => {
    verdiRef.current = verdi;
    lagreRef.current = lagre;
  });

  const lagrerRef = useRef(false);
  const harUsendtRef = useRef(false);
  const forsteRender = useRef(true);

  useEffect(() => {
    if (forsteRender.current) {
      forsteRender.current = false;
      return;
    }
    if (!aktiv) return;

    async function kjorLagring() {
      if (lagrerRef.current) {
        harUsendtRef.current = true;
        return;
      }
      lagrerRef.current = true;
      setStatus("lagrer");
      try {
        await lagreRef.current(verdiRef.current);
        lagrerRef.current = false;
        if (harUsendtRef.current) {
          harUsendtRef.current = false;
          void kjorLagring();
        } else {
          setStatus("lagret");
        }
      } catch {
        lagrerRef.current = false;
        setStatus("feil");
      }
    }

    // setState skjer i timeout-callbacks (ikke synkront i effect-body)
    const venterId = setTimeout(() => setStatus("venter"), 0);
    const lagreId = setTimeout(() => void kjorLagring(), forsinkelseMs);
    return () => {
      clearTimeout(venterId);
      clearTimeout(lagreId);
    };
  }, [verdi, aktiv, forsinkelseMs]);

  return status;
}

/** Kort statustekst til å vise ved siden av skjemaet. */
export function autoLagreTekst(status: AutoLagreStatus): string {
  switch (status) {
    case "venter":
    case "lagrer":
      return "Lagrer…";
    case "lagret":
      return "Lagret ✓";
    case "feil":
      return "Kunne ikke lagre — prøv igjen";
    default:
      return "Endringer lagres automatisk";
  }
}
