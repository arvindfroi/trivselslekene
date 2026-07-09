"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Holder tilskuere oppdatert mens en øvelse pågår: sidedata hentes på nytt
 * med jevne mellomrom (kun når fanen er synlig), slik at fasebytter og nye
 * resultater dukker opp uten manuell refresh. Payloaden er liten nå som
 * bilder ikke lenger inlines i server-renderen.
 */
export default function LiveRefresh({
  aktiv,
  intervallMs = 10_000,
}: {
  aktiv: boolean;
  intervallMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!aktiv) return;

    const oppdater = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const id = setInterval(oppdater, intervallMs);
    document.addEventListener("visibilitychange", oppdater);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", oppdater);
    };
  }, [aktiv, intervallMs, router]);

  return null;
}
