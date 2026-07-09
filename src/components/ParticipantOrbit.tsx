"use client";

import { motion } from "framer-motion";

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

interface OrbitConfig {
  radius: number;
  duration: number;
  clockwise: boolean;
  images: string[];
}

function orbitConfigs(): OrbitConfig[] {
  // 9 bilder fordelt på 3 baner: 3 + 3 + 3
  return [
    {
      radius: 260, // ytre bane
      duration: 28,
      clockwise: true,
      images: images.slice(0, 3),
    },
    {
      radius: 190, // midtre bane
      duration: 22,
      clockwise: false,
      images: images.slice(3, 6),
    },
    {
      radius: 120, // indre bane
      duration: 16,
      clockwise: true,
      images: images.slice(6, 9),
    },
  ];
}

function OrbitRing({ config }: { config: OrbitConfig }) {
  const { radius, duration, clockwise, images: ringImages } = config;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ willChange: "transform" }}
      animate={{ rotate: clockwise ? 360 : -360 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {ringImages.map((src, i) => {
        // Spread images evenly around the ring
        const angle = (360 / ringImages.length) * i;
        return (
          <div
            key={src}
            className="absolute left-1/2 top-1/2"
            style={{
              width: 0,
              height: 0,
              transform: `rotate(${angle}deg) translateX(${radius}px)`,
            }}
          >
            {/* Counter-rotate to keep image upright */}
            <motion.div
              className="flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                marginLeft: -28,
                marginTop: -28,
              }}
              animate={{ rotate: clockwise ? -360 : 360 }}
              transition={{
                duration,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/20 shadow-lg shadow-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Deltaker ${i + 1}`}
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
  const orbits = orbitConfigs();

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center overflow-hidden">
      {orbits.map((config, i) => (
        <OrbitRing key={i} config={config} />
      ))}
    </div>
  );
}
