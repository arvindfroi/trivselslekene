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
