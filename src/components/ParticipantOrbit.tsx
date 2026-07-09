"use client";

import confetti from "canvas-confetti";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

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

function explode(x: number, y: number) {
  const origin = { x: x / window.innerWidth, y: y / window.innerHeight };

  // Første burst: stjerneformet eksplosjon
  confetti({
    particleCount: 60,
    spread: 70,
    origin,
    colors: ["#2be5a0", "#38bdf8", "#7c5cff", "#a855f7", "#fbbf24", "#f472b6"],
    shapes: ["star", "circle"],
    scalar: 1.2,
    ticks: 80,
    gravity: 0.8,
    drift: 0,
    startVelocity: 35,
  });

  // Andre burst: små sirkler med delay for lagdelt effekt
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 100,
      origin,
      colors: ["#fbbf24", "#f472b6", "#2be5a0", "#38bdf8"],
      shapes: ["circle"],
      scalar: 0.7,
      ticks: 60,
      gravity: 0.6,
      drift: 0,
      startVelocity: 25,
    });
  }, 80);

  // Tredje burst: enda mindre, sprer seg bredere
  setTimeout(() => {
    confetti({
      particleCount: 20,
      spread: 120,
      origin,
      colors: ["#ffffff", "#fbbf24", "#a855f7"],
      shapes: ["circle"],
      scalar: 0.5,
      ticks: 50,
      gravity: 0.4,
      drift: 0,
      startVelocity: 20,
    });
  }, 160);
}

function ParticipantImage({
  src,
  imageSize,
}: {
  src: string;
  imageSize: number;
}) {
  const controls = useAnimation();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Pop-animasjon
      controls.start({
        scale: [1, 1.35, 0.9, 1.05, 1],
        transition: { duration: 0.45, ease: "easeOut" },
      });

      explode(cx, cy);
    },
    [controls],
  );

  return (
    <motion.div
      className="flex cursor-pointer items-center justify-center"
      style={{
        width: imageSize,
        height: imageSize,
        marginLeft: -imageSize / 2,
        marginTop: -imageSize / 2,
      }}
      animate={controls}
      onClick={handleClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
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
          className="pointer-events-none h-full w-full object-cover select-none"
          loading="eager"
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

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
            {/* Counter-rotate wrapper for click handling */}
            <motion.div
              className="pointer-events-auto"
              style={{
                width: imageSize,
                height: imageSize,
                marginLeft: -imageSize / 2,
                marginTop: -imageSize / 2,
              }}
              animate={{ rotate: clockwise ? -360 : 360 }}
              transition={{ duration, repeat: Infinity, ease: "linear" }}
              onAnimationStart={undefined}
            >
              <ParticipantImage src={src} imageSize={imageSize} />
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

  const phi = 1.618;
  const base = 18;
  const orbits = [
    { radius: vmin * 0.48, duration: base * phi * phi, clockwise: true, images: images.slice(0, 3) },
    { radius: vmin * 0.34, duration: base * phi, clockwise: false, images: images.slice(3, 6) },
    { radius: vmin * 0.21, duration: base, clockwise: true, images: images.slice(6, 9) },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {orbits.map((cfg, i) => (
        <OrbitRing key={i} {...cfg} imageSize={imageSize} />
      ))}
    </div>
  );
}
