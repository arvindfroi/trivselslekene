"use client";

import { motion } from "framer-motion";

type Props = {
  /**
   * 0 = kun lilla langs kantene, 1 = full lilla + grønn (og en tynn blå
   * som knytter dem sammen). Auroraen ligger rundt kantene — midten er svart.
   */
  reveal?: number;
  /** Litt kraftigere/større pust, f.eks. på hover. */
  boost?: boolean;
  className?: string;
};

// Lilla hugger topp-venstre og bunn-høyre; grønn topp-høyre og bunn-venstre;
// blå ligger som en tynn kobling midt på topp- og bunnkanten. Ingenting når
// midten, så senter av skjermen forblir svart.
const purpleBlobs = [
  { top: "-26%", left: "-22%", d: "18s", delay: "0s", pos: "38% 38%" },
  { bottom: "-26%", right: "-22%", d: "21s", delay: "-7s", pos: "62% 62%" },
];
const greenBlobs = [
  { top: "-26%", right: "-22%", d: "19s", delay: "-4s", pos: "62% 38%" },
  { bottom: "-26%", left: "-22%", d: "23s", delay: "-11s", pos: "38% 62%" },
];
const blueBlobs = [
  { top: "-30%", left: "26vw", width: "48vw", height: "46vh", d: "20s", delay: "-3s", pos: "50% 50%" },
  { bottom: "-30%", left: "26vw", width: "48vw", height: "46vh", d: "24s", delay: "-9s", pos: "50% 50%" },
];

function blob(color: string, alpha: number, b: Record<string, string | undefined>) {
  const { d, delay, pos, ...place } = b;
  return {
    ...place,
    background: `radial-gradient(circle at ${pos}, ${color} 0%, ${color.replace(/[\d.]+\)$/, "0)")} 58%)`,
    animationDuration: d,
    animationDelay: delay,
    // farge-alpha bakes inn via rgba over
    opacity: alpha,
  } as React.CSSProperties;
}

const PURPLE = "rgba(168,85,247,0.9)";
const GREEN = "rgba(43,229,160,0.85)";
const BLUE = "rgba(56,189,248,0.55)";

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
        animate={{ opacity: 1, scale: boost ? 1.05 : 1 }}
        transition={{
          opacity: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
        }}
      >
        {/* Lilla — alltid til stede */}
        {purpleBlobs.map((b, i) => (
          <span key={`p${i}`} className="aurora-blob" style={blob(PURPLE, 1, b)} />
        ))}

        {/* Grønn — vokser sakte frem med reveal */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: reveal }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {greenBlobs.map((b, i) => (
            <span key={`g${i}`} className="aurora-blob" style={blob(GREEN, 1, b)} />
          ))}
        </motion.div>

        {/* Blå — tynn kobling, kommer med grønnen */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: reveal }}
          transition={{ duration: 1.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {blueBlobs.map((b, i) => (
            <span key={`b${i}`} className="aurora-blob" style={blob(BLUE, 1, b)} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
