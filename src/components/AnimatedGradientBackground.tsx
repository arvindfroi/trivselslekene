"use client";

import React, { useEffect, useRef } from "react";

interface AnimatedGradientBackgroundProps {
  startingGap?: number;
  Breathing?: boolean;
  gradientColors?: string[];
  gradientStops?: number[];
  animationSpeed?: number;
  breathingRange?: number;
  containerStyle?: React.CSSProperties;
  containerClassName?: string;
  topOffset?: number;
}

/**
 * AnimatedGradientBackground
 *
 * Originalkomponenten: en radial gradient med en subtil "puste"-effekt.
 * Fargene er Trivselslekenes egne — svart senter, lilla innover og grønn
 * ytterst mot kanten.
 */
const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
  startingGap = 100,
  Breathing = false,
  gradientColors = [
    "#060608",
    "#2a0e45",
    "#a855f7",
    "#7c3aed",
    "#22c55e",
    "#2be5a0",
    "#2be5a0",
  ],
  gradientStops = [30, 46, 58, 68, 78, 90, 100],
  animationSpeed = 0.02,
  breathingRange = 5,
  containerStyle = {},
  topOffset = 0,
  containerClassName = "",
}) => {
  if (gradientColors.length !== gradientStops.length) {
    throw new Error(
      `GradientColors and GradientStops must have the same length.
     Received gradientColors length: ${gradientColors.length},
     gradientStops length: ${gradientStops.length}`
    );
  }

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!Breathing) {
      const gradientStopsString = gradientStops
        .map((stop, index) => `${gradientColors[index]} ${stop}%`)
        .join(", ");
      const gradient = `radial-gradient(${startingGap}% ${startingGap + topOffset}% at 50% 20%, ${gradientStopsString})`;
      if (containerRef.current) {
        containerRef.current.style.background = gradient;
      }
      return;
    }

    let animationFrame: number;
    let width = startingGap;
    let directionWidth = 1;

    const animateGradient = () => {
      if (width >= startingGap + breathingRange) directionWidth = -1;
      if (width <= startingGap - breathingRange) directionWidth = 1;
      width += directionWidth * animationSpeed;

      const gradientStopsString = gradientStops
        .map((stop, index) => `${gradientColors[index]} ${stop}%`)
        .join(", ");

      const gradient = `radial-gradient(${width}% ${width + topOffset}% at 50% 20%, ${gradientStopsString})`;

      if (containerRef.current) {
        containerRef.current.style.background = gradient;
      }

      animationFrame = requestAnimationFrame(animateGradient);
    };

    animationFrame = requestAnimationFrame(animateGradient);

    return () => cancelAnimationFrame(animationFrame);
  }, [
    startingGap,
    Breathing,
    gradientColors,
    gradientStops,
    animationSpeed,
    breathingRange,
    topOffset,
  ]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${containerClassName}`}
      style={{
        animation: "bg-enter 2s cubic-bezier(0.25, 0.1, 0.25, 1) both",
      }}
    >
      <div
        ref={containerRef}
        style={containerStyle}
        className="absolute inset-0 transition-transform"
      />
    </div>
  );
};

export default AnimatedGradientBackground;
