import type { LagFormat } from "@prisma/client";

// ─── Typer ───────────────────────────────────────────────────────

/** Strukturert informasjon om hvordan et LagFormat oversettes til lag. */
export type LagStruktur = {
  antallLag: number;
  /** Antall spillere per lag. null = variabel (TO_LAG, TRE_LAG, etc. deler likt). */
  spillerePerLag: (number | null)[];
  /** Standard lagnavn. */
  lagnavn: string[];
};

export type RankedSpiller = {
  id: string;
  navn: string;
  poeng: number;
};

export type FordeltLag = {
  navn: string;
  medlemmer: string[]; // userId-er
};

// ─── LagFormat → struktur ───────────────────────────────────────

/**
 * Analyserer et LagFormat og returnerer lagstrukturen.
 * For variable formater (TO_LAG, TRE_LAG, FIRE_LAG, FLERE_LAG) brukes
 * `antallDeltakere` for å regne ut antall per lag.
 *
 * Returnerer null for ANNET (kan ikke analyseres automatisk).
 */
export function analyserLagFormat(
  format: LagFormat,
  antallDeltakere: number,
): LagStruktur | null {
  const navn = (antall: number): string[] =>
    Array.from({ length: antall }, (_, i) => `Lag ${i + 1}`);

  switch (format) {
    // ─── Faste lagstørrelser ─────────────────────────────────
    case "PAR":
      return { antallLag: 2, spillerePerLag: [2, 2], lagnavn: navn(2) };

    case "TRIO":
      return { antallLag: 2, spillerePerLag: [3, 3], lagnavn: navn(2) };

    case "FIRE_MOT_FIRE":
      return { antallLag: 2, spillerePerLag: [4, 4], lagnavn: navn(2) };

    case "FEM_MOT_FEM":
      return { antallLag: 2, spillerePerLag: [5, 5], lagnavn: navn(2) };

    case "FIRE_MOT_FEM":
      return { antallLag: 2, spillerePerLag: [4, 5], lagnavn: navn(2) };

    case "TRE_MOT_TRE_MOT_TRE":
      return { antallLag: 3, spillerePerLag: [3, 3, 3], lagnavn: navn(3) };

    case "TO_MOT_TO_MOT_TO_MOT_TO":
      return { antallLag: 4, spillerePerLag: [2, 2, 2, 2], lagnavn: navn(4) };

    // ─── Variable lagstørrelser ──────────────────────────────
    case "TO_LAG": {
      return {
        antallLag: 2,
        spillerePerLag: [null, null],
        lagnavn: navn(2),
      };
    }

    case "TRE_LAG": {
      return {
        antallLag: 3,
        spillerePerLag: [null, null, null],
        lagnavn: navn(3),
      };
    }

    case "FIRE_LAG": {
      return {
        antallLag: 4,
        spillerePerLag: [null, null, null, null],
        lagnavn: navn(4),
      };
    }

    case "FLERE_LAG": {
      // For FLERE_LAG deler vi inn i lag à 2 (minimum for et lag).
      // Hvis det ikke er nok deltakere til minst 5 lag, brukes færre.
      const lagStorrelse = 2;
      const antallLag = Math.max(1, Math.floor(antallDeltakere / lagStorrelse));
      return {
        antallLag,
        spillerePerLag: Array(antallLag).fill(lagStorrelse),
        lagnavn: navn(antallLag),
      };
    }

    case "ANNET":
      return null;

    default: {
      // Type-sikkerhet: skal ikke skje, men håndterer ukjente formater
      const _exhaustive: never = format;
      return null;
    }
  }
}

// ─── Snake-draft seeding ───────────────────────────────────────

/**
 * Fordeler spillere på lag ved hjelp av en "snake draft":
 * - Spillere sorteres etter poeng (høyest først)
 * - Lag velger i slange-rekkefølge: 1→N, så N→1, så 1→N, osv.
 *
 * Dette gir balanserte lag der hvert lag får en blanding av
 * topp-, midt- og bunnspillere.
 */
export function fordelSpillere(
  spillere: RankedSpiller[],
  struktur: LagStruktur,
): FordeltLag[] {
  const { antallLag, lagnavn } = struktur;

  // Sorter alle spillere etter poeng synkende
  const sorterte = [...spillere].sort((a, b) => b.poeng - a.poeng);

  // Initier tomme lag
  const lag: { navn: string; medlemmer: string[] }[] = lagnavn.map((navn) => ({
    navn,
    medlemmer: [] as string[],
  }));

  // Beregn faktiske lagstørrelser (løs opp null-verdier for variable formater)
  const lagStorrelser = losLagStorrelser(struktur.spillerePerLag, sorterte.length);

  // Sjekk at vi har nok spillere
  const totaltBehov = lagStorrelser.reduce((sum, s) => sum + s, 0);
  if (sorterte.length < totaltBehov) {
    // Ikke nok spillere — fordel alle så godt det lar seg gjøre
    // Bruk en enkel round-robin i stedet
    return fordelEnkel(sorterte, antallLag, lagnavn);
  }

  // Snake-draft algoritme
  let spillerIndeks = 0;
  let retning = 1; // 1 = fremover (0→N-1), -1 = bakover (N-1→0)
  let lagIndeks = 0;

  while (spillerIndeks < sorterte.length) {
    const laget = lag[lagIndeks];
    const maxStorrelse = lagStorrelser[lagIndeks];

    // Hopp over lag som allerede er fulle
    if (laget.medlemmer.length < maxStorrelse) {
      laget.medlemmer.push(sorterte[spillerIndeks].id);
      spillerIndeks++;
    }

    // Neste lag i snake-rekkefølge
    const nesteIndeks = lagIndeks + retning;

    if (nesteIndeks >= antallLag || nesteIndeks < 0) {
      // Snu retning ved enden av runden
      retning = -retning;
      // Ikke endre lagIndeks — fortsett fra samme posisjon (siste lag i forrige runde)
      // Men hvis siste lag er fullt, hopp
      if (lag[lagIndeks].medlemmer.length >= lagStorrelser[lagIndeks]) {
        lagIndeks += retning;
      }
    } else {
      lagIndeks = nesteIndeks;
    }
  }

  return lag;
}

// ─── Hjelpefunksjoner ──────────────────────────────────────────

/** Løser opp null-verdier i lagstørrelser ved å fordele jevnt. */
function losLagStorrelser(
  storrelser: (number | null)[],
  antallSpillere: number,
): number[] {
  const nullCount = storrelser.filter((s) => s === null).length;
  if (nullCount === 0) return storrelser as number[];

  // Tell opp allerede faste plasser
  const fastePlasser = storrelser.reduce<number>(
    (sum, s) => sum + (s ?? 0),
    0,
  );
  const resterende = antallSpillere - fastePlasser;

  if (resterende <= 0) {
    // Alle allerede fordelt eller for få spillere
    return storrelser.map((s) => s ?? 0);
  }

  // Fordel resterende jevnt blant lag med null
  const perLag = Math.floor(resterende / nullCount);
  let remainder = resterende % nullCount;

  return storrelser.map((s) => {
    if (s !== null) return s;
    const plasser = perLag + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    return plasser;
  });
}

/** Enkel round-robin-fordeling når det ikke er nok spillere. */
function fordelEnkel(
  spillere: RankedSpiller[],
  antallLag: number,
  lagnavn: string[],
): FordeltLag[] {
  const lag: FordeltLag[] = lagnavn.map((navn) => ({
    navn,
    medlemmer: [],
  }));

  // Snake-draft selv med for få spillere
  const sorterte = [...spillere].sort((a, b) => b.poeng - a.poeng);
  let retning = 1;
  let lagIndeks = 0;

  for (const spiller of sorterte) {
    lag[lagIndeks].medlemmer.push(spiller.id);

    const neste = lagIndeks + retning;
    if (neste >= antallLag || neste < 0) {
      retning = -retning;
    } else {
      lagIndeks = neste;
    }
  }

  return lag;
}

// ─── Validering ────────────────────────────────────────────────

export type ValideringsResultat =
  | { ok: true; struktur: LagStruktur; minDeltakere: number }
  | { ok: false; feilmelding: string };

/**
 * Validerer at et LagFormat kan auto-genereres og at det er nok deltakere.
 */
export function validerLagFormat(
  format: LagFormat,
  antallDeltakere: number,
): ValideringsResultat {
  if (format === "ANNET") {
    return {
      ok: false,
      feilmelding:
        '"Annet oppsett" kan ikke opprettes automatisk. Velg et konkret lagoppsett.',
    };
  }

  const struktur = analyserLagFormat(format, antallDeltakere);
  if (!struktur) {
    return {
      ok: false,
      feilmelding: "Ukjent lagoppsett — kan ikke opprettes automatisk.",
    };
  }

  const lagStorrelser = losLagStorrelser(
    struktur.spillerePerLag,
    antallDeltakere,
  );
  const minDeltakere = lagStorrelser.reduce((sum, s) => sum + s, 0);

  if (antallDeltakere < minDeltakere) {
    // For variable formater der null skal løses: vis antall per lag
    const fordeling = lagStorrelser
      .map((s, i) => `${struktur.lagnavn[i]}: ${s} deltakere`)
      .join(", ");

    return {
      ok: false,
      feilmelding: `For få deltakere. Trenger minst ${minDeltakere} deltakere (${fordeling}). Det er kun ${antallDeltakere} tilgjengelige.`,
    };
  }

  return { ok: true, struktur, minDeltakere };
}
