"use client";

import { motion } from "framer-motion";

const BILDER = [
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

const INITIAL_RADII = [200, 200, 200, 150, 150, 150, 100, 100, 100];
const CIRCLE_RADIUS = 130;
const IMG_SIZE = 52;
const SPIN_DURATION = 10;

function polar(radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

export default function LoadingOrbit() {
  const angleStep = 360 / BILDER.length;

  return (
    <motion.div
      className="fixed left-1/2 top-1/2"
      style={{ width: 0, height: 0 }}
      animate={{ rotate: 360 }}
      transition={{
        duration: SPIN_DURATION,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {BILDER.map((src, i) => {
        const angle = angleStep * i;
        const start = polar(INITIAL_RADII[i], angle);
        const end = polar(CIRCLE_RADIUS, angle);

        return (
          <motion.div
            key={src}
            className="absolute"
            style={{ width: 0, height: 0 }}
            initial={{
              x: start.x,
              y: start.y,
              opacity: 0.5,
              scale: 0.75,
            }}
            animate={{
              x: end.x,
              y: end.y,
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.04 * i,
            }}
          >
            <motion.div
              style={{
                width: IMG_SIZE,
                height: IMG_SIZE,
                marginLeft: -IMG_SIZE / 2,
                marginTop: -IMG_SIZE / 2,
              }}
              animate={{ rotate: -360 }}
              transition={{
                duration: SPIN_DURATION,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <motion.div
                className="overflow-hidden rounded-full"
                style={{
                  width: IMG_SIZE,
                  height: IMG_SIZE,
                  border: "2px solid rgba(255,255,255,0.15)",
                }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.7 + i * 0.08,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="eager"
                  draggable={false}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
