"use client";

import { useEffect, useState } from "react";

const alleBilder = [
  "/deltakere/deltaker-1.webp",
  "/deltakere/deltaker-2.webp",
  "/deltakere/deltaker-3.webp",
  "/deltakere/deltaker-4.webp",
  "/deltakere/deltaker-5.webp",
  "/deltakere/deltaker-6.webp",
  "/deltakere/deltaker-7.webp",
  "/deltakere/deltaker-8.webp",
  "/deltakere/deltaker-9.webp",
];

/**
 * Antall samtidige bilder:
 * 1 på små mobiler (<640px)
 * 2 på nettbrett/mellomstore skjermer (640–1024px)
 * 3 på desktop (≥1024px)
 */
function useGruppeStorrelse() {
  const [gruppe, setGruppe] = useState<number | null>(null);

  useEffect(() => {
    function oppdater() {
      const w = window.innerWidth;
      if (w < 640) setGruppe(1);
      else if (w < 1024) setGruppe(2);
      else setGruppe(3);
    }
    oppdater();
    window.addEventListener("resize", oppdater);
    return () => window.removeEventListener("resize", oppdater);
  }, []);

  return gruppe;
}

export default function DeltakerSlideshow() {
  const gruppe = useGruppeStorrelse();
  const antallGrupper = gruppe ? Math.ceil(alleBilder.length / gruppe) : 0;
  const [aktivGruppe, setAktivGruppe] = useState(0);

  useEffect(() => {
    if (!gruppe) return;
    const timer = setInterval(() => {
      setAktivGruppe((prev) => (prev + 1) % antallGrupper);
    }, 4500);
    return () => clearInterval(timer);
  }, [antallGrupper, gruppe]);

  // Ikke rendr før vi vet skjermbredden — unngår flash av feil antall bilder
  if (gruppe === null) return null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Alle bilder ligger i DOM med opacity-transition for jevn crossfade.
          pointer-events: none på inaktive så de ikke blokkerer touch. */}
      {Array.from({ length: antallGrupper }).map((_, gi) => {
        const start = gi * gruppe;
        const bilder = alleBilder.slice(start, start + gruppe);
        const bredde = `${100 / gruppe}%`;

        return bilder.map((src, i) => {
          const aktiv = gi === aktivGruppe;

          return (
            <div
              key={src}
              className="absolute top-0 h-full"
              style={{
                width: bredde,
                left: `${i * (100 / gruppe)}%`,
                opacity: aktiv ? 1 : 0,
                // Lengre, jevnere overgang — 2s med ease-in-out gir myk inn/ut
                transition: `opacity ${aktiv ? "2s ease-out" : "1.8s ease-in"}`,
                // Inaktive bilder skal ikke fange touch/klikk
                pointerEvents: aktiv ? "auto" : "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Deltaker"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: "50% 30%",
                  filter: "brightness(0.7)",
                  // Hindre at bildet blinker hvitt under lasting på iPhone
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                loading="lazy"
              />
            </div>
          );
        });
      })}

      {/* Mørkt overlay så innholdet er lesbart */}
      <div className="absolute inset-0 bg-bg/75 backdrop-blur-[2px]" />
    </div>
  );
}
