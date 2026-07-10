// Delt bento-mosaikk brukt på både Leker og Statistikk.
export const BENTO_GRID =
  "grid grid-cols-2 gap-3 sm:auto-rows-[8.5rem] sm:grid-flow-row-dense sm:grid-cols-4";

export const BENTO_SPENN = [
  "sm:col-span-2 sm:row-span-2",
  "sm:row-span-2",
  "",
  "sm:col-span-2",
  "",
  "sm:row-span-2",
  "sm:col-span-2",
  "",
];

export function bentoSpenn(i: number): string {
  return BENTO_SPENN[i % BENTO_SPENN.length];
}

/** Høye fliser (2 rader) får større ikon/tekst så de fyller plassen. */
export function erStor(i: number): boolean {
  return bentoSpenn(i).includes("row-span-2");
}

/** Antall grid-celler (kolonne × rad) en spenn-klassestreng opptar ved 4 kolonner. */
export function cellerFraSpenn(spenn: string): number {
  const kolonner = spenn.includes("col-span-2") ? 2 : 1;
  const rader = spenn.includes("row-span-2") ? 2 : 1;
  return kolonner * rader;
}

/**
 * Antall usynlige 1×1-fyllceller som må legges til på slutten av gridet for
 * at totalarealet skal gå opp i hele rader (4 kolonner). Dette garanterer at
 * mosaikken alltid danner et rektangel — uansett antall fliser, og uansett
 * om én av dem er utvidet og dermed opptar mer plass enn vanlig.
 */
export function antallFyllCeller(spennListe: string[]): number {
  const brukt = spennListe.reduce((sum, s) => sum + cellerFraSpenn(s), 0);
  return (4 - (brukt % 4)) % 4;
}

/**
 * Blander en liste deterministisk ut fra et tekst-frø (Fisher-Yates +
 * mulberry32). Samme frø gir alltid samme rekkefølge — bento-mosaikken
 * blander kategorier fremfor å gruppere dem, uten at kortene bytter
 * plass på hver sideinnlasting.
 */
export function seededShuffle<T>(liste: T[], froe: string): T[] {
  let seed = 0;
  for (let i = 0; i < froe.length; i++) {
    seed = (Math.imul(31, seed) + froe.charCodeAt(i)) | 0;
  }
  const random = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const ut = [...liste];
  for (let i = ut.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ut[i], ut[j]] = [ut[j], ut[i]];
  }
  return ut;
}
