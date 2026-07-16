import type { FinaleData, FinaleDeltaker, Innslag, Pris, Vendepunkt } from "@/lib/finale";
import { fjoraretStilling } from "@/lib/fjoraaret";

/** En deltaker som løftet nivået sitt fra i fjor, målt i snittpoeng per lek —
 *  en rettferdig sammenligning selv om antall leker og deltakere varierer
 *  mellom årene. */
export type FramgangPost = {
  userId: string;
  fornavn: string;
  bildeUrl: string | null;
  farge: string | null;
  ifjorSnitt: number;
  iaarSnitt: number;
  ifjorPlass: number;
  iaarPlass: number;
};

/** Minste snittløft (poeng/lek) som teller som reell framgang — filtrerer
 *  bort ren måle­støy. */
const FRAMGANG_TERSKEL = 0.5;

/** Finner deltakere som presterte bedre enn i fjor. Kobler årets deltakere til
 *  fjorårets på fornavn, og sammenligner snittpoeng per lek. Ren funksjon. */
export function byggFramgang(data: FinaleData): FramgangPost[] {
  const fjor = new Map(
    fjoraretStilling().map((r) => [r.navn.toLowerCase(), r]),
  );
  const poster: FramgangPost[] = [];
  for (const d of data.deltakere) {
    const f = fjor.get(d.fornavn.toLowerCase());
    if (!f) continue;
    if (d.snitt - f.snitt >= FRAMGANG_TERSKEL) {
      poster.push({
        userId: d.userId,
        fornavn: d.fornavn,
        bildeUrl: d.bildeUrl,
        farge: d.farge,
        ifjorSnitt: f.snitt,
        iaarSnitt: d.snitt,
        ifjorPlass: f.plass,
        iaarPlass: d.plass,
      });
    }
  }
  // Størst løft først
  poster.sort((a, b) => b.iaarSnitt - b.ifjorSnitt - (a.iaarSnitt - a.ifjorSnitt));
  return poster;
}

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
  | { key: string; type: "framgang"; framgang: FramgangPost[] }
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
    // Etter kåringen (ingen spoiler-fare): hvem løftet seg fra i fjor?
    const framgang = byggFramgang(data);
    if (framgang.length > 0) {
      slides.push({ key: "framgang", type: "framgang", framgang });
    }
    slides.push({ key: "tallene", type: "tallene" });
  }
  return slides;
}
