/**
 * Poengberegning for rangering av deltakere i en individuell øvelse, inkludert
 * uavgjort (delt plassering). Ren logikk — deles av redigeringskomponenten og
 * testene.
 */

// Standard poeng for plassering 1–8+. Utover 8. plass = 0 poeng.
export const STANDARD_POENG = [10, 8, 6, 5, 4, 3, 2, 1];

export function standardPoengFor(plass: number): number {
  if (plass < 1) return 0;
  const idx = plass - 1;
  return idx < STANDARD_POENG.length ? STANDARD_POENG[idx] : 0;
}

export type PlasseringInfo = {
  /** Plasseringen som vises (delt plass = samme tall for hele gruppa). */
  plassering: number;
  /** Plasseringen poengene regnes fra. Ved uavgjort er dette den LAVESTE
   *  plasseringen i gruppa, slik at alle deler den laveste poengsummen. */
  poengPlassering: number;
};

/**
 * Beregner plasseringer med støtte for delt plassering (uavgjort).
 * `delPlass[i]` = true betyr at rad i deler plassering med rad i-1.
 *
 * Tiede rader får samme (høyeste) plassering til visning, men poengene
 * regnes fra den laveste plasseringen i gruppa — slik deler de uavgjorte
 * spillerne den laveste poengsummen. Eks: to spillere som deler 1. og 2.
 * plass står begge som «1.», men får begge 2.-plass-poengene (8), ikke 10.
 *
 * Eks: 5 rader, delPlass = [false, true, false, false, false]
 *   → plassering      = [1, 1, 3, 4, 5]
 *   → poengPlassering = [2, 2, 3, 4, 5]
 */
export function beregnPlasseringer(delPlass: boolean[]): PlasseringInfo[] {
  const n = delPlass.length;
  const ut: PlasseringInfo[] = new Array(n);
  let i = 0;
  let plass = 1;

  while (i < n) {
    // Finn slutten av tie-gruppen som starter på rad i
    let j = i;
    while (j + 1 < n && delPlass[j + 1]) {
      j++;
    }
    const gruppeStorrelse = j - i + 1;
    // Laveste plassering i gruppa — poengene alle deler
    const poengPlassering = plass + gruppeStorrelse - 1;
    for (let k = i; k <= j; k++) {
      ut[k] = { plassering: plass, poengPlassering };
    }
    plass += gruppeStorrelse; // hopp over gruppens størrelse
    i = j + 1;
  }

  return ut;
}
