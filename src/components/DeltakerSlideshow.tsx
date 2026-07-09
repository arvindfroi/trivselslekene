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

function useGruppeStorrelse() {
  const [gruppe, setGruppe] = useState(3);

  useEffect(() => {
    function oppdater() {
      setGruppe(window.innerWidth < 640 ? 1 : 3);
    }
    oppdater();
    window.addEventListener("resize", oppdater);
    return () => window.removeEventListener("resize", oppdater);
  }, []);

  return gruppe;
}

export default function DeltakerSlideshow() {
  const gruppe = useGruppeStorrelse();
  const antallGrupper = Math.ceil(alleBilder.length / gruppe);
  const [indeks, setIndeks] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndeks((prev) => (prev + 1) % antallGrupper);
    }, 4000);
    return () => clearInterval(timer);
  }, [antallGrupper]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {Array.from({ length: antallGrupper }).map((_, gi) => {
        const aktiv = gi === indeks;
        const start = gi * gruppe;
        const bilder = alleBilder.slice(start, start + gruppe);
        const bredde = `${100 / gruppe}%`;
        return bilder.map((src, i) => (
          <div
            key={src}
            className="absolute top-0 h-full"
            style={{
              width: bredde,
              left: `${i * (100 / gruppe)}%`,
              opacity: aktiv ? 1 : 0,
              transition: "opacity 1.5s ease",
              zIndex: aktiv ? 1 : 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Deltaker"
              className="h-full w-full object-cover"
              style={{ objectPosition: "50% 30%", filter: "brightness(0.65)" }}
            />
          </div>
        ));
      })}

      {/* Mørkt overlay så innholdet er lesbart */}
      <div className="absolute inset-0 bg-bg/75 backdrop-blur-[2px]" />
    </div>
  );
}
