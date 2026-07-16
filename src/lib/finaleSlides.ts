import type { FinaleData, FinaleDeltaker, Innslag, Pris, Vendepunkt } from "@/lib/finale";

/**
 * Ren slide-bygger (ingen React) — gjør FinaleData om til den ferdige
 * slide-rekkefølgen showet spiller av. Skilt ut fra FinaleShow så
 * invariantene kan bevises i test: at det ALLTID kommer en vinner-slide,
 * at rekkefølgen er stabil, og at variasjonen holder.
 */
export type Slide =
  | { key: string; type: "intro" }
  | { key: string; type: "ifjor" }
  | { key: string; type: "vifte" }
  | { key: string; type: "kapittel"; nr: number; tittel: string; tekst: string }
  | { key: string; type: "innslag"; innslag: Innslag }
  | { key: string; type: "pris"; pris: Pris }
  | { key: string; type: "hederlig" }
  | { key: string; type: "vendepunkt"; vendepunkt: Vendepunkt }
  | { key: string; type: "tidslinje" }
  | { key: string; type: "trommevirvel" }
  | { key: string; type: "vinner"; deltaker: FinaleDeltaker }
  | { key: string; type: "tallene" };

export function byggSlides(data: FinaleData): Slide[] {
  const slides: Slide[] = [{ key: "intro", type: "intro" }];
  let kapittel = 0;

  // Et lite tilbakeblikk til forrige utgave før vi går inn i årets show —
  // fjorårets pall og et par tall, som en «tidligere i lekene»-vignett.
  slides.push({ key: "ifjor", type: "ifjor" });

  // Årets felt: alle deltakerne som kortvifte, à la karaktervalget i
  // Mario Party — før historien begynner
  if (data.deltakere.length >= 2) {
    slides.push({ key: "vifte", type: "vifte" });
  }

  if (data.innslag.length > 0) {
    kapittel += 1;
    slides.push({
      key: "kap-historien",
      type: "kapittel",
      nr: kapittel,
      tittel: "Historien",
      tekst: "Øyeblikkene og funnene tallene ikke kunne skjule",
    });
    data.innslag.forEach((innslag, i) => {
      slides.push({ key: `innslag-${innslag.slag}-${i}`, type: "innslag", innslag });
    });
  }

  if (data.priser.length > 0 || data.hederlige.length > 0) {
    kapittel += 1;
    slides.push({
      key: "kap-priser",
      type: "kapittel",
      nr: kapittel,
      tittel: "Prisutdelingen",
      tekst: "Ære, berømmelse og evig heder",
    });
    for (const p of data.priser) {
      slides.push({ key: `pris-${p.key}`, type: "pris", pris: p });
    }
    if (data.hederlige.length > 0) {
      slides.push({ key: "hederlig", type: "hederlig" });
    }
  }

  // Siste kapittel: vendepunktet setter opp tidslinjen og kåringen
  if (data.vendepunkt) {
    slides.push({ key: "vendepunkt", type: "vendepunkt", vendepunkt: data.vendepunkt });
  }
  if (data.tidslinje.length > 0) {
    slides.push({ key: "tidslinje", type: "tidslinje" });
  }
  const vinner = data.deltakere[0];
  if (vinner) {
    slides.push({ key: "trommevirvel", type: "trommevirvel" });
    slides.push({ key: "vinner", type: "vinner", deltaker: vinner });
    slides.push({ key: "tallene", type: "tallene" });
  }
  return slides;
}
