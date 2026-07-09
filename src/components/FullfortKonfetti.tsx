"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

/**
 * Fyrer av konfetti når en øvelse settes til FULLFØRT.
 * Plasseres på øvelsessiden — trigger kun én gang per FULLFØRT-status.
 */
export default function FullfortKonfetti({ status }: { status: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (status !== "FULLFORT" || fired.current) return;
    fired.current = true;

    const varighet = 3000;
    const slutt = Date.now() + varighet;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#FFD700", "#C0C0C0", "#CD7F32"], // gull, sølv, bronse
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#FFD700", "#C0C0C0", "#CD7F32"],
      });

      if (Date.now() < slutt) {
        requestAnimationFrame(frame);
      }
    };

    // Første salve: eksplosjon fra midten
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FFD700", "#C0C0C0", "#CD7F32"],
    });

    setTimeout(() => requestAnimationFrame(frame), 500);
  }, [status]);

  return null;
}
