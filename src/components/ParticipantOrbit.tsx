"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
  radius: number; // vmin-basert
  duration: number;
  clockwise: boolean;
  images: string[];
}

function PhysicsOrbitRing({
  radius,
  duration,
  clockwise,
  images: ringImages,
  imageSize,
  viewportW,
  viewportH,
}: {
  radius: number;
  duration: number;
  clockwise: boolean;
  images: string[];
  imageSize: number;
  viewportW: number;
  viewportH: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 80, damping: 18 });
  const springY = useSpring(y, { stiffness: 80, damping: 18 });

  const vx = useRef(0);
  const vy = useRef(0);
  const posX = useRef(0);
  const posY = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    // Start med tilfeldig retning, men kun i nettleser
    vx.current = (Math.random() - 0.5) * 0.6;
    vy.current = (Math.random() - 0.5) * 0.6;

    const halfW = viewportW / 2;
    const halfH = viewportH / 2;
    const bounceMargin = radius + imageSize / 2;

    const tick = () => {
      // Gentle random drift force
      vx.current += (Math.random() - 0.5) * 0.08;
      vy.current += (Math.random() - 0.5) * 0.08;

      // Friction
      vx.current *= 0.998;
      vy.current *= 0.998;

      // Clamp velocity
      const maxV = 1.2;
      vx.current = Math.max(-maxV, Math.min(maxV, vx.current));
      vy.current = Math.max(-maxV, Math.min(maxV, vy.current));

      posX.current += vx.current;
      posY.current += vy.current;

      // Bounce off walls
      if (posX.current > halfW - bounceMargin) {
        posX.current = halfW - bounceMargin;
        vx.current *= -0.7;
      } else if (posX.current < -halfW + bounceMargin) {
        posX.current = -halfW + bounceMargin;
        vx.current *= -0.7;
      }

      if (posY.current > halfH - bounceMargin) {
        posY.current = halfH - bounceMargin;
        vy.current *= -0.7;
      } else if (posY.current < -halfH + bounceMargin) {
        posY.current = -halfH + bounceMargin;
        vy.current *= -0.7;
      }

      x.set(posX.current);
      y.set(posY.current);

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [radius, imageSize, viewportW, viewportH, x, y]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ x: springX, y: springY }}
    >
      <motion.div
        className="absolute left-1/2 top-1/2"
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

  // Bilde tar ~1/30 av skjermarealet: side = sqrt(w*h/30)
  const imageSize = Math.round(Math.sqrt((dims.w * dims.h) / 30));
  const vmin = Math.min(dims.w, dims.h);

  const orbits: OrbitConfig[] = [
    { radius: vmin * 0.42, duration: 32, clockwise: true, images: images.slice(0, 3) },
    { radius: vmin * 0.30, duration: 26, clockwise: false, images: images.slice(3, 6) },
    { radius: vmin * 0.19, duration: 20, clockwise: true, images: images.slice(6, 9) },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {orbits.map((cfg, i) => (
        <PhysicsOrbitRing
          key={i}
          radius={cfg.radius}
          duration={cfg.duration}
          clockwise={cfg.clockwise}
          images={cfg.images}
          imageSize={imageSize}
          viewportW={dims.w}
          viewportH={dims.h}
        />
      ))}
    </div>
  );
}
