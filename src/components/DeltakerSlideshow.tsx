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
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <AnimatePresence mode="popLayout">
        {aktive.map((src) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="overflow-hidden rounded-full shadow-lg shadow-black/40"
            style={{
              width: 56,
              height: 56,
              border: "3px solid rgba(255,255,255,0.10)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Deltaker"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
