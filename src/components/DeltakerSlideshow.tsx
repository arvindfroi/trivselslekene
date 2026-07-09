"use client";

import { motion, AnimatePresence } from "framer-motion";
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

/** Del opp i grupper på 3 */
const grupper = alleBilder.reduce<string[][]>((acc, _, i) => {
  if (i % 3 === 0) acc.push(alleBilder.slice(i, i + 3));
  return acc;
}, []);

export default function DeltakerSlideshow() {
  const [indeks, setIndeks] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndeks((prev) => (prev + 1) % grupper.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const aktive = grupper[indeks];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {aktive.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute top-0 h-full"
            style={{
              width: "33.333%",
              left: `${i * 33.333}%`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Deltaker"
              className="h-full w-full object-cover"
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Mørkt overlay så innholdet er lesbart */}
      <div className="absolute inset-0 bg-bg/75 backdrop-blur-[2px]" />
    </div>
  );
}
