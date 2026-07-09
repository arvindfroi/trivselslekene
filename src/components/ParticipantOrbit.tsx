"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const images = [
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

interface OrbitRingProps {
  radius: number;
  duration: number;
  clockwise: boolean;
  images: string[];
  imageSize: number;
}

function OrbitRing({ radius, duration, clockwise, images: ringImages, imageSize }: OrbitRingProps) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{ width: 0, height: 0 }}
      animate={{ rotate: clockwise ? 360 : -360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {ringImages.map((src, i) => {
        const angle = (360 / ringImages.length) * i;
        return (
          <div
            key={src}
            className="absolute"
            style={{
              width: 0,
              height: 0,
              transform: `rotate(${angle}deg) translateX(${radius}px)`,
            }}
          >
            <motion.div
              className="flex items-center justify-center"
              style={{
                width: imageSize,
                height: imageSize,
                marginLeft: -imageSize / 2,
                marginTop: -imageSize / 2,
              }}
              animate={{ rotate: clockwise ? -360 : 360 }}
              transition={{ duration, repeat: Infinity, ease: "linear" }}
            >
              <div
                className="overflow-hidden rounded-full shadow-lg shadow-black/40"
                style={{
                  width: imageSize,
                  height: imageSize,
                  border: "3px solid rgba(255,255,255,0.12)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="Deltaker"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        );
      })}
    </motion.div>
  );
}

export default function ParticipantOrbit() {
  const [dims, setDims] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ~1/30 av skjermarealet, minus 30% = sqrt(w*h/30) * 0.7
  const imageSize = Math.round(Math.sqrt((dims.w * dims.h) / 30) * 0.7);
  const vmin = Math.min(dims.w, dims.h);

  // Tre baner med gylne snitt-hastigheter — aldri i takt
  const phi = 1.618;
  const base = 18;
  const orbits = [
    { radius: vmin * 0.48, duration: base * phi * phi, clockwise: true,  images: images.slice(0, 3) },  // ytre: ~47s
    { radius: vmin * 0.34, duration: base * phi,       clockwise: false, images: images.slice(3, 6) },  // midtre: ~29s
    { radius: vmin * 0.21, duration: base,              clockwise: true,  images: images.slice(6, 9) },  // indre: 18s
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {orbits.map((cfg, i) => (
        <OrbitRing key={i} {...cfg} imageSize={imageSize} />
      ))}
    </div>
  );
}
