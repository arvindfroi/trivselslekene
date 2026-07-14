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

// ─── Expected seed map (ideal bracket) ─────────────────────────────────────

function minSeed(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function maxSeed(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

type AdvanceSlot = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
  somDeltager: 1 | 2;
};

function nesteForVinner(slot: KampSlot, P: number): AdvanceSlot | null {
  const { bracket, runde, posisjon } = slot;
  const WR = winnersRunder(P);
  const LR = losersRunder(P);

  if (bracket === "W") {
    if (runde === WR) return { bracket: "G", runde: 1, posisjon: 1, somDeltager: 1 };
    return { bracket: "W", runde: runde + 1, posisjon: Math.ceil(posisjon / 2), somDeltager: posisjon % 2 === 1 ? 1 : 2 };
  }
  if (bracket === "L") {
    if (runde === LR) return { bracket: "G", runde: 1, posisjon: 1, somDeltager: 2 };
    if (runde % 2 === 1) return { bracket: "L", runde: runde + 1, posisjon, somDeltager: 1 };
    return { bracket: "L", runde: runde + 1, posisjon: Math.ceil(posisjon / 2), somDeltager: posisjon % 2 === 1 ? 1 : 2 };
  }
  return null;
}

function nesteForTaper(slot: KampSlot, P: number): AdvanceSlot | null {
  const { bracket, runde, posisjon } = slot;
  const WR = winnersRunder(P);
  const LR = losersRunder(P);
  if (bracket !== "W") return null;
  if (runde === WR) return { bracket: "L", runde: LR, posisjon: 1, somDeltager: 2 };
  if (runde === 1) return { bracket: "L", runde: 1, posisjon: Math.ceil(posisjon / 2), somDeltager: posisjon % 2 === 1 ? 1 : 2 };
  return { bracket: "L", runde: 2 * runde - 2, posisjon, somDeltager: 2 };
}

/**
 * Returnerer en Map fra slot-nøkkel ("W-1-1", "L-2-1", etc.) til forventede
 * seed-numre i et ideelt bracket der laveste seed alltid vinner.
 */
export function expectedSeedMap(
  P: number,
  N: number,
): Map<string, { d1: number | null; d2: number | null }> {
  const map = new Map<string, { d1: number | null; d2: number | null }>();
  const key = (b: string, r: number, p: number) => `${b}-${r}-${p}`;

  // Initialiser alle slots med null
  for (const s of bracketSlots(P)) {
    map.set(key(s.bracket, s.runde, s.posisjon), { d1: null, d2: null });
  }

  // WR1 direkte fra seedRekkefolge
  const seeds = seedRekkefolge(P);
  for (let i = 0; i < seeds.length; i += 2) {
    const s1 = seeds[i];
    const s2 = seeds[i + 1];
    const pos = i / 2 + 1;
    map.set(key("W", 1, pos), {
      d1: s1 <= N ? s1 : null,
      d2: s2 <= N ? s2 : null,
    });
  }

  // BFS: prosesser slots som har begge seeds
  const queue: KampSlot[] = [];
  for (let p = 1; p <= P / 2; p++) {
    const e = map.get(key("W", 1, p));
    if (e && e.d1 !== null && e.d2 !== null) queue.push({ bracket: "W", runde: 1, posisjon: p });
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const entry = map.get(key(current.bracket, current.runde, current.posisjon));
    if (!entry || entry.d1 === null || entry.d2 === null) continue;

    const winner = minSeed(entry.d1, entry.d2);
    const loser = maxSeed(entry.d1, entry.d2);
    if (winner === null) continue;

    // Avanser vinner
    const wTarget = nesteForVinner(current, P);
    if (wTarget) {
      const tk = key(wTarget.bracket, wTarget.runde, wTarget.posisjon);
      const te = map.get(tk);
      if (te) {
        const next =
          wTarget.somDeltager === 1
            ? { d1: winner, d2: te.d2 }
            : { d1: te.d1, d2: winner };
        map.set(tk, next);
        if (next.d1 !== null && next.d2 !== null)
          queue.push({ bracket: wTarget.bracket, runde: wTarget.runde, posisjon: wTarget.posisjon });
      }
    }

    // Avanser taper (kun fra winners bracket)
    if (loser !== null && current.bracket === "W") {
      const lTarget = nesteForTaper(current, P);
      if (lTarget) {
        const tk = key(lTarget.bracket, lTarget.runde, lTarget.posisjon);
        const te = map.get(tk);
        if (te) {
          const next =
            lTarget.somDeltager === 1
              ? { d1: loser, d2: te.d2 }
              : { d1: te.d1, d2: loser };
          map.set(tk, next);
          if (next.d1 !== null && next.d2 !== null)
            queue.push({ bracket: lTarget.bracket, runde: lTarget.runde, posisjon: lTarget.posisjon });
        }
      }
    }
  }

  return map;
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
