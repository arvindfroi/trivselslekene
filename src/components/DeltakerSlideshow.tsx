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

const GRUPPE = 3;
const antallGrupper = Math.ceil(alleBilder.length / GRUPPE);

export default function DeltakerSlideshow() {
  const [indeks, setIndeks] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndeks((prev) => (prev + 1) % antallGrupper);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {Array.from({ length: antallGrupper }).map((_, gi) => {
        const aktiv = gi === indeks;
        const start = gi * GRUPPE;
        const bilder = alleBilder.slice(start, start + GRUPPE);
        return bilder.map((src, i) => (
          <div
            key={src}
            className="absolute top-0 h-full"
            style={{
              width: "33.333%",
              left: `${i * 33.333}%`,
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
