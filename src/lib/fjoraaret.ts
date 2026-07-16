/**
 * Fjorårets Trivselslekene (2025) — historiske resultater, lagt inn manuelt
 * fra regnearket.
 *
 * Fjoråret var en enklere utgave enn dagens app: lekene hadde INGEN egenskaper
 * (kvaliteter), og de hadde heller ingen egne navn. Det eneste vi vet er hvem
 * som arrangerte («hosta») hver lek, så lekene navngis etter verten sin.
 * To unntak: «Marble lek» var maskinstyrt (marmorrace) og hadde ingen vert, og
 * «Emils lek» ble aldri gjennomført.
 *
 * Ren, avhengighetsfri modul (ingen Prisma/server-import) slik at den kan
 * brukes både i server- og klientkomponenter — inkludert finaleshowet.
 */

export const FJORARET_AAR = 2025;
export const FJORARET_NAVN = `Trivselslekene ${FJORARET_AAR}`;

/** Deltakerne i fjorårets utgave, i regnearkets kolonnerekkefølge. */
export const FJORARET_DELTAKERE = [
  "Ruben",
  "Arvind",
  "Morten",
  "Eivind",
  "Fridrik",
  "Emil",
  "Fredrik",
  "Lars",
  "Adrian",
  "My",
] as const;

export type FjorNavn = (typeof FJORARET_DELTAKERE)[number];

/** Fast, distinkt farge per fjorårsdeltaker — samme palettfilosofi som
 *  BRUKER_FARGER (mørke farger laget for hvit tekst), men frosset her så
 *  modulen holder seg server-fri. */
const FJORARET_FARGER: Record<FjorNavn, string> = {
  Ruben: "#1b3654",
  Arvind: "#561828",
  Morten: "#184a2c",
  Eivind: "#563a18",
  Fridrik: "#3a1856",
  Emil: "#1a3947",
  Fredrik: "#471a39",
  Lars: "#394718",
  Adrian: "#561d35",
  My: "#184739",
};

/** Fargen til en fjorårsdeltaker (null hvis navnet ikke er kjent). */
export function fjorFarge(navn: string): string | null {
  return FJORARET_FARGER[navn as FjorNavn] ?? null;
}

export type FjorLek = {
  /** Visningsnavn. Fjoråret hadde ingen ekte leknavn, så vi bruker verten. */
  navn: string;
  /** Hvem som arrangerte leken; null for det maskinstyrte «Marble lek». */
  vert: FjorNavn | null;
  /** Poeng per deltaker. Verten deltar ikke i sin egen lek. */
  poeng: Partial<Record<FjorNavn, number>>;
  /** Ble leken faktisk gjennomført? «Emils lek» ble aldri noe av. */
  gjennomfort: boolean;
};

/** Rådataene fra regnearket, i samme rekkefølge som de sto der. */
export const FJORARET_LEKER: FjorLek[] = [
  {
    navn: "Rubens lek",
    vert: "Ruben",
    gjennomfort: true,
    poeng: { Arvind: 10, Morten: 5, Eivind: 6, Fridrik: 8, Emil: 1, Fredrik: 2, Lars: 6, Adrian: 4, My: 1 },
  },
  {
    navn: "Arvinds lek",
    vert: "Arvind",
    gjennomfort: true,
    poeng: { Ruben: 10, Morten: 2, Eivind: 8, Fridrik: 5, Emil: 1, Fredrik: 4, Lars: 3, Adrian: 6, My: 1 },
  },
  {
    navn: "Mortens lek",
    vert: "Morten",
    gjennomfort: true,
    poeng: { Ruben: 1, Arvind: 4, Eivind: 5, Fridrik: 6, Emil: 10, Fredrik: 2, Lars: 10, Adrian: 1, My: 3 },
  },
  {
    navn: "Eivinds lek",
    vert: "Eivind",
    gjennomfort: true,
    poeng: { Ruben: 1, Arvind: 8, Morten: 4, Fridrik: 10, Emil: 2, Fredrik: 6, Lars: 5, Adrian: 3, My: 2 },
  },
  {
    navn: "Fridriks lek",
    vert: "Fridrik",
    gjennomfort: true,
    poeng: { Ruben: 5, Arvind: 10, Morten: 1, Eivind: 6, Emil: 2, Fredrik: 10, Lars: 4, Adrian: 4, My: 2 },
  },
  {
    // Sto oppført i regnearket, men ble aldri gjennomført.
    navn: "Emils lek",
    vert: "Emil",
    gjennomfort: false,
    poeng: {},
  },
  {
    navn: "Fredriks lek",
    vert: "Fredrik",
    gjennomfort: true,
    poeng: { Ruben: 6, Arvind: 1, Morten: 3, Eivind: 2, Fridrik: 10, Emil: 5, Lars: 4, Adrian: 6, My: 5 },
  },
  {
    navn: "Lars' lek",
    vert: "Lars",
    gjennomfort: true,
    poeng: { Ruben: 6, Arvind: 3, Morten: 8, Eivind: 10, Fridrik: 5, Emil: 1, Fredrik: 2, Adrian: 4, My: 5 },
  },
  {
    navn: "Adrians lek",
    vert: "Adrian",
    gjennomfort: true,
    poeng: { Ruben: 10, Arvind: 3, Morten: 5, Eivind: 8, Fridrik: 4, Emil: 3, Fredrik: 3, Lars: 8, My: 3 },
  },
  {
    // Maskinstyrt marmorrace — ingen menneskelig vert, alle deltok.
    navn: "Marble lek",
    vert: null,
    gjennomfort: true,
    poeng: { Ruben: 8, Arvind: 4, Morten: 2, Eivind: 10, Fridrik: 6, Emil: 3, Fredrik: 5, Lars: 0, Adrian: 1, My: 1 },
  },
];

/** Bare lekene som faktisk ble spilt. */
export const FJORARET_SPILTE_LEKER = FJORARET_LEKER.filter((l) => l.gjennomfort);

export type FjorRad = {
  navn: FjorNavn;
  farge: string;
  plass: number;
  totalPoeng: number;
  /** Leker deltakeren faktisk deltok i (verten er ikke med i sin egen). */
  antallLeker: number;
  /** Leker der deltakeren tok (delt) toppscore. */
  seire: number;
  /** Gjennomførte leker deltakeren arrangerte som vert. */
  verter: number;
  /** Høyeste enkeltscore gjennom sesongen. */
  beste: number;
  /** Snittpoeng per lek deltatt i. */
  snitt: number;
};

/** Beregner fjorårets sammenlagtstilling, vinneren først. Ren funksjon. */
export function fjoraretStilling(): FjorRad[] {
  // Toppscore per gjennomført lek — brukes til å telle «seire».
  const toppPerLek = FJORARET_SPILTE_LEKER.map((lek) =>
    Math.max(...Object.values(lek.poeng)),
  );

  const rader = FJORARET_DELTAKERE.map((navn) => {
    let totalPoeng = 0;
    let antallLeker = 0;
    let seire = 0;
    let beste = 0;

    FJORARET_SPILTE_LEKER.forEach((lek, i) => {
      const p = lek.poeng[navn];
      if (p === undefined) return;
      totalPoeng += p;
      antallLeker += 1;
      if (p > beste) beste = p;
      if (p === toppPerLek[i]) seire += 1;
    });

    const verter = FJORARET_SPILTE_LEKER.filter((l) => l.vert === navn).length;

    return {
      navn,
      farge: FJORARET_FARGER[navn],
      plass: 0,
      totalPoeng,
      antallLeker,
      seire,
      verter,
      beste,
      snitt: antallLeker ? totalPoeng / antallLeker : 0,
    };
  });

  rader.sort((a, b) => b.totalPoeng - a.totalPoeng);
  rader.forEach((r, i) => {
    r.plass =
      i > 0 && r.totalPoeng === rader[i - 1].totalPoeng ? rader[i - 1].plass : i + 1;
  });
  return rader;
}

/** Fjorårets mester (deltakeren på 1. plass). */
export function fjoraretVinner(): FjorRad {
  return fjoraretStilling()[0];
}
