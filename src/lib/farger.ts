import { prisma } from "@/lib/prisma";

/** 24 distinkte, mørke farger — én per deltager.
 *  Alle fungerer som bakgrunnsfarger med hvit tekst over.
 *  Valgt for å komplementere aksentfargene (grønn #2be5a0, grønn #22c55e, lilla #a855f7).
 *  Ved behov for flere deltagere enn 24 genereres nye farger automatisk. */
export const BRUKER_FARGER = [
  "#1b3654", //  1. hsl(215, 52%, 22%)  — mørkeblå
  "#561828", //  2. hsl(350, 55%, 22%)  — dyp rød
  "#184a2c", //  3. hsl(150, 52%, 20%)  — dyp skoggrønn
  "#563a18", //  4. hsl( 30, 55%, 22%)  — dyp oransje/amber
  "#3a1856", //  5. hsl(275, 52%, 22%)  — dyp lilla
  "#1a3947", //  6. hsl(190, 48%, 20%)  — dyp teal
  "#471a39", //  7. hsl(320, 48%, 20%)  — dyp magenta
  "#394718", //  8. hsl( 75, 48%, 20%)  — dyp lime/oliven
  "#561d35", //  9. hsl(340, 48%, 22%)  — dyp rosa
  "#184739", // 10. hsl(165, 48%, 20%)  — dyp mint
  "#473d18", // 11. hsl( 48, 48%, 20%)  — dyp gull
  "#281836", // 12. hsl(262, 45%, 18%)  — dyp indigo

  // ─── Nye farger for utvidet palett ──────────────────────────────
  "#182d47", // 13. hsl(210, 50%, 19%)
  "#47182a", // 14. hsl(340, 50%, 19%)
  "#18472e", // 15. hsl(150, 50%, 19%)
  "#472e18", // 16. hsl( 28, 50%, 19%)
  "#2e1847", // 17. hsl(265, 50%, 19%)
  "#183347", // 18. hsl(195, 50%, 19%)
  "#3d1847", // 19. hsl(285, 50%, 19%)
  "#334718", // 20. hsl( 85, 50%, 19%)
  "#47182d", // 21. hsl(335, 50%, 19%)
  "#184740", // 22. hsl(170, 50%, 19%)
  "#403d18", // 23. hsl( 55, 50%, 19%)
  "#221847", // 24. hsl(255, 50%, 19%)
] as const;

export type BrukerFarge = string;

/** Genererer en ny, ubrukt farge basert på en indeks utover paletten.
 *  Bruker gyldent snitt for jevn spredning rundt fargesirkelen. */
export function genererNyFarge(indeks: number): string {
  const gyllentSnitt = 0.618033988749895;
  const hue = ((indeks * gyllentSnitt * 360) % 360).toFixed(1);
  // Varierer metning og lyshet lett for mer variasjon
  const s = 45 + (indeks % 3) * 4;
  const l = 19 + (indeks % 4) * 2;
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

/** Tildeler en unik farge til en ny deltager.
 *  Sjekker alle eksisterende farger i databasen og velger den første
 *  ubrukte fra paletten. Hvis alle 24 palettfarger er i bruk,
 *  genereres en ny farge automatisk. */
export async function tildelFarge(): Promise<BrukerFarge> {
  // Hent alle farger som allerede er i bruk
  const brukte = new Set(
    (
      await prisma.user.findMany({
        where: { farge: { not: null } },
        select: { farge: true },
      })
    ).map((u) => u.farge!.toLowerCase()),
  );

  // Finn første ubrukte palettfarge
  for (const farge of BRUKER_FARGER) {
    if (!brukte.has(farge.toLowerCase())) {
      return farge;
    }
  }

  // Alle 24 palettfarger er i bruk — generer nye
  for (let i = 0; i < 200; i++) {
    const ny = genererNyFarge(i);
    if (!brukte.has(ny.toLowerCase())) {
      return ny;
    }
  }

  // Ekstrem fallback (skal i praksis aldri nås)
  return genererNyFarge(Date.now());
}
