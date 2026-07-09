"use client";

import { useEffect, useRef } from "react";

const STANDARD_POENG = [10, 8, 6, 5, 4, 3, 2, 1];

/**
 * Foreslår poeng automatisk når verten fyller ut plassering.
 * Brukes i resultatregistrering på øvelsessiden.
 * Krever at plassering-input har name="plassering" og poeng-input
 * har name="poeng" inne i samme <form>.
 */
export default function PoengForslag() {
  const poengRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Finn plasserings-input ved å lytte på endringer
    const handler = (e: Event) => {
      const plasseringInput = e.target as HTMLInputElement;
      if (plasseringInput.name !== "plassering") return;

      const form = plasseringInput.closest("form");
      if (!form) return;

      const poengInput = form.querySelector<HTMLInputElement>('input[name="poeng"]');
      if (!poengInput || poengInput.dataset.manuelt === "true") return;

      const plass = parseInt(plasseringInput.value, 10);
      if (plass >= 1 && plass <= STANDARD_POENG.length) {
        poengRef.current = poengInput;
        poengInput.value = String(STANDARD_POENG[plass - 1]);
      }
    };

    // Merk poeng-input som "manuell" når brukeren endrer den selv
    const markerManuell = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.name === "poeng") {
        input.dataset.manuelt = "true";
      }
    };

    document.addEventListener("input", handler);
    document.addEventListener("input", markerManuell);

    return () => {
      document.removeEventListener("input", handler);
      document.removeEventListener("input", markerManuell);
    };
  }, []);

  return null;
}
