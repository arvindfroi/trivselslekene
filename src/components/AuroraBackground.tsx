"use client";

import { motion } from "framer-motion";

type Props = {
  /**
   * 0 = kun lilla ring, 1 = full lilla + grønn ytterst (og en tynn blå som
   * kobler dem). Radialt: svart senter → lilla innover → grønn mot kanten.
   */
  reveal?: number;
  /** Litt kraftigere/større pust, f.eks. på hover. */
  boost?: boolean;
  className?: string;
};

// Alle lag er sentrerte radiale gradienter. Midten er gjennomsiktig (svart
// bakgrunn synes), fargene ligger som ringer utover mot kanten.
const PURPLE_RING =
  "radial-gradient(65% 65% at 50% 50%, transparent 0%, transparent 40%, rgba(168,85,247,0.55) 60%, rgba(168,85,247,0.22) 74%, transparent 86%)";
const BLUE_RING =
  "radial-gradient(66% 66% at 50% 50%, transparent 0%, transparent 60%, rgba(56,189,248,0.3) 78%, transparent 90%)";
const GREEN_EDGE =
  "radial-gradient(68% 68% at 50% 50%, transparent 0%, transparent 68%, rgba(43,229,160,0.5) 88%, rgba(43,229,160,0.7) 100%)";

export default function AuroraBackground({
  reveal = 1,
  boost = false,
  className = "",
}: Props) {
  return (
    <div className={`overflow-hidden bg-black ${className}`}>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, scale: boost ? 1.06 : 1 }}
        transition={{
          opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
        }}
      >
        {/* Lilla ring — alltid til stede */}
        <div
          className="aurora-ring"
          style={{ background: PURPLE_RING, animationDuration: "19s" }}
        />

        {/* Blå kobling — kommer med grønnen */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: reveal }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="aurora-ring"
            style={{ background: BLUE_RING, animationDuration: "23s", animationDelay: "-5s" }}
          />
        </motion.div>

        {/* Grønn ytterst mot kanten — vokser sakte frem med reveal */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: reveal }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="aurora-ring"
            style={{ background: GREEN_EDGE, animationDuration: "21s", animationDelay: "-9s" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
