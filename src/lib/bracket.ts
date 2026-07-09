// ─── Bracket-generator for 8 deltagere (dobbel-eliminering) ───────────────

export type KampSlot = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
};

/**
 * Returnerer alle kamp-slottene for en 8-spillers dobbel-eliminering.
 * "G" = Grand Finals (med potensiell reset-kamp).
 */
export function bracketSlots(): KampSlot[] {
  const slots: KampSlot[] = [];

  // Winners bracket
  for (let r = 1; r <= 3; r++) {
    const antall = Math.pow(2, 3 - r); // 4, 2, 1
    for (let p = 1; p <= antall; p++) {
      slots.push({ bracket: "W", runde: r, posisjon: p });
    }
  }

  // Losers bracket
  // LR1: 2 matches (losers from WR1)
  // LR2: 2 matches (winners of LR1 vs losers from WR2)
  // LR3: 1 match  (winners of LR2)
  // LR4: 1 match  (winner of LR3 vs loser of WF/WR3)
  slots.push({ bracket: "L", runde: 1, posisjon: 1 });
  slots.push({ bracket: "L", runde: 1, posisjon: 2 });
  slots.push({ bracket: "L", runde: 2, posisjon: 1 });
  slots.push({ bracket: "L", runde: 2, posisjon: 2 });
  slots.push({ bracket: "L", runde: 3, posisjon: 1 });
  slots.push({ bracket: "L", runde: 4, posisjon: 1 });

  // Grand Finals (1 match, reset legges til dynamisk ved behov)
  slots.push({ bracket: "G", runde: 1, posisjon: 1 });

  return slots;
}
