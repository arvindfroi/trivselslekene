"use client";

import { kvalitetTekst, ALLE_KVALITETER } from "@/lib/ovelseLabels";
import type { Kvalitet } from "@prisma/client";

type KiviatDiagramProps = {
  /** Spillerens poeng per kvalitet. */
  spillersPoeng: Record<Kvalitet, number>;
  /** Maksimal poengsum per kvalitet (på tvers av alle spillere). */
  maksPoeng: Record<Kvalitet, number>;
};

const SENTRUM = 130;
const RADIUS = 110;
const NIVAAER = 5; // antall konsentriske ringer

/** Konverterer polar-koordinater til SVG-koordinater. */
function pol(
  vinkelRad: number,
  avstand: number,
): { x: number; y: number } {
  return {
    x: SENTRUM + avstand * Math.cos(vinkelRad - Math.PI / 2),
    y: SENTRUM + avstand * Math.sin(vinkelRad - Math.PI / 2),
  };
}

export default function KiviatDiagram({
  spillersPoeng,
  maksPoeng,
}: KiviatDiagramProps) {
  const vinkelSteg = (2 * Math.PI) / ALLE_KVALITETER.length;

  // Bygg polygon-punkt for spillerens verdier
  const spillerPunkter = ALLE_KVALITETER.map((k, i) => {
    const max = maksPoeng[k] || 1;
    const verdi = spillersPoeng[k] || 0;
    const ratio = Math.min(verdi / max, 1);
    return pol(i * vinkelSteg, ratio * RADIUS);
  });

  const spillerPolygon = spillerPunkter
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  // Bygg bakgrunnsnivåer (konsentriske polygoner)
  const nivaPolygoner = Array.from({ length: NIVAAER }, (_, niva) => {
    const r = ((niva + 1) / NIVAAER) * RADIUS;
    return ALLE_KVALITETER.map((_, i) => pol(i * vinkelSteg, r))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  });

  // Akse-linjer
  const akser = ALLE_KVALITETER.map((_, i) => {
    const ytre = pol(i * vinkelSteg, RADIUS);
    return { x: ytre.x, y: ytre.y };
  });

  // Labels (plassert litt utenfor aksene)
  const labels = ALLE_KVALITETER.map((k, i) => {
    const p = pol(i * vinkelSteg, RADIUS + 22);
    return { ...p, tekst: kvalitetTekst[k] };
  });

  const SIZE = SENTRUM * 2;

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full max-w-[280px]"
        aria-label="Kiviatdiagram over ferdigheter relativt til andre"
      >
        {/* Konsentriske nivåer */}
        {nivaPolygoner.map((punkter, i) => (
          <polygon
            key={i}
            points={punkter}
            fill="none"
            stroke="rgb(255 255 255 / 0.08)"
            strokeWidth={1}
          />
        ))}

        {/* Akse-linjer */}
        {akser.map((p, i) => (
          <line
            key={i}
            x1={SENTRUM}
            y1={SENTRUM}
            x2={p.x}
            y2={p.y}
            stroke="rgb(255 255 255 / 0.08)"
            strokeWidth={1}
          />
        ))}

        {/* Spillerens polygon */}
        <polygon
          points={spillerPolygon}
          fill="rgb(16 185 129 / 0.15)"
          stroke="rgb(16 185 129 / 0.7)"
          strokeWidth={2}
        />

        {/* Spillerens punkter */}
        {spillerPunkter.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="rgb(16 185 129)"
            stroke="rgb(16 185 129 / 0.3)"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-fg-faint text-[9px]"
            style={{ fontSize: "9px" }}
          >
            {l.tekst}
          </text>
        ))}
      </svg>
    </div>
  );
}
