// ─── Bracket-generator for N deltagere (dobbel-eliminering) ────────────────
// Støtter alle N ≥ 4 via "byes" — brackets baseres på neste 2-potens P.
// F.eks. 9 deltagere → 16-bracket med 7 byes.

export type KampSlot = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
};

/** Neste 2-potens ≥ N (minst 4) */
export function bracketSize(N: number): number {
  if (N < 4) return 4;
  return Math.pow(2, Math.ceil(Math.log2(N)));
}

/** Antall byes = P - N */
export function antallByes(N: number): number {
  return bracketSize(N) - N;
}

/** Antall faktiske kamper i WR1 (resten er byes) */
export function wr1Matches(N: number): number {
  const P = bracketSize(N);
  return N - P / 2;
}

/**
 * Returnerer alle kamp-slottene for en P-spillers dobbel-eliminering.
 * P må være en 2-potens ≥ 4.
 */
export function bracketSlots(P: number): KampSlot[] {
  if (P < 4 || (P & (P - 1)) !== 0) {
    throw new Error(`Bracket size må være en 2-potens ≥ 4 (fikk ${P})`);
  }

  const R = Math.log2(P);
  const slots: KampSlot[] = [];

  // Winners bracket
  for (let r = 1; r <= R; r++) {
    const antall = P / Math.pow(2, r);
    for (let p = 1; p <= antall; p++) {
      slots.push({ bracket: "W", runde: r, posisjon: p });
    }
  }

  // Losers bracket
  if (P === 4) {
    slots.push({ bracket: "L", runde: 1, posisjon: 1 });
    slots.push({ bracket: "L", runde: 2, posisjon: 1 });
  } else {
    let matches = P / 4;
    let lrRunde = 1;
    while (matches >= 1) {
      for (let p = 1; p <= matches; p++) {
        slots.push({ bracket: "L", runde: lrRunde, posisjon: p });
      }
      lrRunde++;
      for (let p = 1; p <= matches; p++) {
        slots.push({ bracket: "L", runde: lrRunde, posisjon: p });
      }
      lrRunde++;
      matches = matches / 2;
    }
  }

  slots.push({ bracket: "G", runde: 1, posisjon: 1 });
  return slots;
}

// ─── Hjelpere for advance-funksjonene ──────────────────────────────────────

export function winnersRunder(P: number): number {
  return Math.log2(P);
}

export function losersRunder(P: number): number {
  if (P === 4) return 2;
  return 2 * (Math.log2(P) - 1);
}

// ─── WR1 seeding ───────────────────────────────────────────────────────────

/**
 * Returnerer seed-rekkefølgen for WR1-posisjoner i en P-bracket.
 */
export function seedRekkefolge(P: number): number[] {
  if (P === 2) return [1, 2];
  const half = seedRekkefolge(P / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(P + 1 - s);
  }
  return result;
}

/**
 * Returnerer [(seedA, seedB, posisjon), ...] for WR1-kamper (KUN faktiske kamper, ikke byes).
 * N = faktisk antall deltagere.
 * Posisjon telles kun for faktiske kamper (1, 2, ...).
 */
export function wr1Par(N: number): [number, number, number][] {
  const P = bracketSize(N);
  const allSeeds = seedRekkefolge(P);
  const pairs: [number, number, number][] = [];

  let pos = 0;
  for (let i = 0; i < allSeeds.length; i += 2) {
    const s1 = allSeeds[i];
    const s2 = allSeeds[i + 1];
    const s1Real = s1 <= N;
    const s2Real = s2 <= N;

    if (s1Real && s2Real) {
      // Begge ekte → faktisk kamp
      pairs.push([s1, s2, ++pos]);
    }
    // Hvis bare én er ekte → bye (håndteres i opprettTurnering)
  }

  return pairs;
}

/**
 * Returnerer hvilke seed-numre (1..N) som får byes (walkover til runde 2).
 */
export function byeSeeds(N: number): number[] {
  const P = bracketSize(N);
  const allSeeds = seedRekkefolge(P);
  const byes: number[] = [];

  for (let i = 0; i < allSeeds.length; i += 2) {
    const s1 = allSeeds[i];
    const s2 = allSeeds[i + 1];
    const s1Real = s1 <= N;
    const s2Real = s2 <= N;

    if (s1Real && !s2Real) {
      byes.push(s1); // s2 er virtuell → s1 får bye
    } else if (!s1Real && s2Real) {
      byes.push(s2); // s1 er virtuell → s2 får bye
    }
  }

  return byes;
}
