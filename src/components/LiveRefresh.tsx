"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Holder tilskuere oppdatert mens en ovelse pagar: poller /api/helse
 * for a sjekke om data er endret (lastModified), og kaller kun
 * router.refresh() nar noe faktisk har skjedd. Dette sparer ~90% av
 * RSC-re-renders nar ingenting endrer seg.
 */
export default function LiveRefresh({
  aktiv,
  intervallMs = 10_000,
}: {
  aktiv: boolean;
  intervallMs?: number;
}) {
  const router = useRouter();
  const lastModifiedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!aktiv) return;

    const sjekkOgOppdater = async () => {
      if (document.visibilityState !== "visible") return;

      // Sjekk /api/helse — hvis lastModified er uendret, skip refresh.
      try {
        const res = await fetch("/api/helse");
        const data = await res.json();
        const current: number | null = data.lastModified ?? null;

        if (current !== null && current === lastModifiedRef.current) {
          return; // ingen endring — dropp full RSC-re-render
        }
        lastModifiedRef.current = current;
      } catch {
        // Nettverksfeil eller API-feil — fail open: refresh likevel
      }

      router.refresh();
    };

    const id = setInterval(sjekkOgOppdater, intervallMs);
    document.addEventListener("visibilitychange", sjekkOgOppdater);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sjekkOgOppdater);
    };
  }, [aktiv, intervallMs, router]);

  return null;
}
