/** Fargepalett for automatisk brukertildeling.
 *  Tolv distinkte, mørke farger som fungerer som bakgrunnsfarger
 *  på øvelseskort med hvit tekst over. Valgt for å komplementere
 *  de eksisterende aksentfargene (grønn #2be5a0, grønn #22c55e, lilla #a855f7). */
export const BRUKER_FARGER = [
  "#1b3654", // 1. mørkeblå — hsl(215, 52%, 22%)
  "#561828", // 2. dyp rød — hsl(350, 55%, 22%)
  "#184a2c", // 3. dyp skoggrønn — hsl(150, 52%, 20%)
  "#563a18", // 4. dyp oransje/amber — hsl(30, 55%, 22%)
  "#3a1856", // 5. dyp lilla — hsl(275, 52%, 22%)
  "#1a3947", // 6. dyp teal — hsl(190, 48%, 20%)
  "#471a39", // 7. dyp magenta — hsl(320, 48%, 20%)
  "#394718", // 8. dyp lime/oliven — hsl(75, 48%, 20%)
  "#561d35", // 9. dyp rosa — hsl(340, 48%, 22%)
  "#184739", // 10. dyp mint — hsl(165, 48%, 20%)
  "#473d18", // 11. dyp gull — hsl(48, 48%, 20%)
  "#281836", // 12. dyp indigo — hsl(262, 45%, 18%)
] as const;

export type BrukerFarge = (typeof BRUKER_FARGER)[number];

/** Tildeler en farge deterministisk basert på bruker-ID.
 *  Samme ID gir alltid samme farge, uavhengig av rekkefølge
 *  eller slettede brukere. Kollisjoner er mulige, men akseptable. */
export function tildelFarge(userId: string): BrukerFarge {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return BRUKER_FARGER[Math.abs(hash) % BRUKER_FARGER.length];
}
