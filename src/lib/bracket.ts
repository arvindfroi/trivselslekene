// ─── Bracket-generator for N deltagere (dobbel-eliminering, N ∈ {4, 8, 16}) ──

export type KampSlot = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
};

/**
 * Returnerer alle kamp-slottene for en N-spillers dobbel-eliminering.
 * N må være 4, 8 eller 16.
 * "G" = Grand Finals (med potensiell reset-kamp).
 */
export function bracketSlots(antallDeltagere: number): KampSlot[] {
  if (![4, 8, 16].includes(antallDeltagere)) {
    throw new Error(`Antall deltagere må være 4, 8 eller 16 (fikk ${antallDeltagere})`);
  }

  const R = Math.log2(antallDeltagere); // antall winners-runder
  const slots: KampSlot[] = [];

  // Winners bracket: R runder, antallDeltagere/(2^r) kamper per runde
  for (let r = 1; r <= R; r++) {
    const antall = antallDeltagere / Math.pow(2, r);
    for (let p = 1; p <= antall; p++) {
      slots.push({ bracket: "W", runde: r, posisjon: p });
    }
  }

  // Losers bracket
  if (antallDeltagere === 4) {
    // 2 runder à 1 kamp hver
    slots.push({ bracket: "L", runde: 1, posisjon: 1 });
    slots.push({ bracket: "L", runde: 2, posisjon: 1 });
  } else {
    // For N≥8: 2*(R-1) runder, i par: N/4, N/4, N/8, N/8, ..., 1, 1
    let matches = antallDeltagere / 4;
    let lrRunde = 1;
    while (matches >= 1) {
      // Første runde i paret
      for (let p = 1; p <= matches; p++) {
        slots.push({ bracket: "L", runde: lrRunde, posisjon: p });
      }
      lrRunde++;
      // Andre runde i paret
      for (let p = 1; p <= matches; p++) {
        slots.push({ bracket: "L", runde: lrRunde, posisjon: p });
      }
      lrRunde++;
      matches = matches / 2;
    }
  }

  // Grand Finals
  slots.push({ bracket: "G", runde: 1, posisjon: 1 });

  return slots;
}

// ─── Hjelpere for advance-funksjonene ──────────────────────────────────────

/** Antall winners-runder for N deltagere */
export function winnersRunder(N: number): number {
  return Math.log2(N);
}

/** Antall losers-runder for N deltagere */
export function losersRunder(N: number): number {
  if (N === 4) return 2;
  return 2 * (Math.log2(N) - 1);
}

/** Antall kamper i en gitt losers-runde */
export function matchesILosersRunde(lrRunde: number, N: number): number {
  if (N === 4) return 1;
  const pairIndex = Math.floor((lrRunde - 1) / 2);
  return N / Math.pow(2, pairIndex + 2);
}

// ─── WR1 seeding ───────────────────────────────────────────────────────────

/**
 * Returnerer seed-rekkefølgen for WR1-posisjoner.
 * F.eks. for N=8: [1,8,4,5,3,6,2,7]
 * De to og to danner kamper: (1,8), (4,5), (3,6), (2,7)
 */
export function seedRekkefolge(N: number): number[] {
  if (N === 2) return [1, 2];
  const half = seedRekkefolge(N / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(N + 1 - s);
  }
  return result;
}

/**
 * Returnerer [(seed1, seed2, posisjon), ...] for WR1-paringer.
 */
export function wr1Par(N: number): [number, number, number][] {
  const seeds = seedRekkefolge(N);
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    pairs.push([seeds[i], seeds[i + 1], i / 2 + 1]);
  }
  return pairs;
}
