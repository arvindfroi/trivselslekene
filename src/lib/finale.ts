import { prisma } from "@/lib/prisma";
import type { Kvalitet } from "@prisma/client";
import {
  hentAlleSesongData,
  hentKvalitetsledere,
  hentSpillerdetaljer,
  hentStilling,
  hentUtmerkelser,
  type SesongData,
} from "@/lib/stilling";
import { kvalitetTekst } from "@/lib/ovelseLabels";

// ─── Typer ───────────────────────────────────────────────────────

export type FinaleDeltaker = {
  userId: string;
  navn: string;
  fornavn: string;
  bildeUrl: string | null;
  farge: string | null;
  plass: number;
  totalPoeng: number;
  antallOvelser: number;
  seire: number;
  pall: number;
  rekord: number;
  snitt: number;
  besteKvalitet: string | null;
  utmerkelser: string[];
  kommentar: string;
  /** Deltakerens beste enkeltlek — brukes i hederlige omtaler */
  besteOvelse: { navn: string; poeng: number } | null;
};

export type TidslinjeSteg = {
  nr: number;
  ovelseNavn: string;
  /** Kumulativ stilling etter denne leken, sortert med flest poeng øverst */
  stilling: { userId: string; poeng: number }[];
  lederId: string | null;
  lederbytte: boolean;
};

export type TidslinjePerson = {
  navn: string;
  fornavn: string;
  farge: string | null;
  bildeUrl: string | null;
};

/** Kumulativ plassering per deltaker etter hver lek, til grafene */
export type Posisjoner = {
  ovelser: string[];
  serier: { userId: string; ranks: (number | null)[] }[];
};

// ─── Innslag: byggeklossene showet settes sammen av ──────────────

/** To personer, én lek, stor eller liten margin — vises som duell med barer */
export type DuellInnslag = {
  slag: "duell";
  variant: "storseier" | "thriller" | "knockout" | "oppgjor";
  tittel: string;
  emoji: string;
  tekst: string;
  ovelseNavn: string;
  ovelseNr: number;
  vinner: { userId: string; poeng: number };
  taper: { userId: string; poeng: number };
};

/** En reise gjennom stillingen: comeback (posisjonsgraf) eller fall (fallscene) */
export type ReiseInnslag = {
  slag: "comeback" | "fall";
  tittel: string;
  emoji: string;
  tekst: string;
  userId: string;
  fra: number;
  til: number;
};

/** Sesongens høyeste enkeltscore — vises som telleverk */
export type RekordInnslag = {
  slag: "rekord";
  tittel: string;
  emoji: string;
  tekst: string;
  userId: string;
  poeng: number;
  ovelseNavn: string;
};

/** Innbyrdes oppgjør mellom de to jevneste deltakerne (utenom vinneren) */
export type RivalInnslag = {
  slag: "rival";
  tittel: string;
  emoji: string;
  tekst: string;
  aId: string;
  bId: string;
  aSeire: number;
  bSeire: number;
  uavgjort: number;
  runder: { ovelseNavn: string; utfall: "A" | "B" | "U" }[];
};

/** Hvem som bar ledertrøya — vises som fargebånd over etappene */
export type LedertroyeInnslag = {
  slag: "ledertroye";
  tittel: string;
  emoji: string;
  tekst: string;
  userId: string;
  antall: number;
};

/** Statistisk avvik: sjokkresultatet eller sluttspurten — vises som før/etter-tall */
export type AvvikInnslag = {
  slag: "avvik";
  variant: "sjokk" | "sluttspurt";
  tittel: string;
  emoji: string;
  tekst: string;
  userId: string;
  fraVerdi: string;
  fraLabel: string;
  tilVerdi: string;
  tilLabel: string;
};

/** To deltakere med påfallende lik eller motsatt rytme — vises som doble kurver */
export type TvillingInnslag = {
  slag: "tvillinger";
  variant: "tvillinger" | "motpoler";
  tittel: string;
  emoji: string;
  tekst: string;
  aId: string;
  bId: string;
  aRanks: number[];
  bRanks: number[];
  prosent: number;
};

/** Topp tre innen én egenskap — vises som podium à la Mario Party */
export type PodiumInnslag = {
  slag: "podium";
  tittel: string;
  emoji: string;
  tekst: string;
  kvalitet: string;
  /** 1., 2. og 3. plass med samlet poengsum i egenskapen */
  topp: { userId: string; poeng: number }[];
};

/** Én leks fulle resultatliste som søyler — enten fordi potten var
 *  uvanlig stor (poengfest) eller fordi leken ristet sammendraget
 *  (jordskjelv, med opp/ned-merker per deltaker) */
export type PoengfestInnslag = {
  slag: "poengfest";
  variant: "poengfest" | "jordskjelv";
  tittel: string;
  emoji: string;
  tekst: string;
  undertekst: string;
  ovelseNavn: string;
  ovelseNr: number;
  resultater: { userId: string; poeng: number; endring?: number }[];
};

/** Den tetteste klyngen i sammendraget — avatarer på en poengskala */
export type TetsjiktInnslag = {
  slag: "tetsjikt";
  tittel: string;
  emoji: string;
  tekst: string;
  spenn: number;
  medlemmer: { userId: string; poeng: number }[];
};

/** En deltakers heteste eller kaldeste periode: tre påfølgende leker med
 *  høyest (topp) eller lavest (svikt) samlet poengsum. */
export type FormInnslag = {
  slag: "form";
  variant: "topp" | "svikt";
  tittel: string;
  emoji: string;
  tekst: string;
  userId: string;
  sum: number;
  /** De tre lekene i perioden, i kronologisk rekkefølge */
  perLek: { ovelseNr: number; ovelseNavn: string; poeng: number }[];
};

/** Deltakeren med høyest poengsnitt innen én egenskap — «spesialisten» —
 *  blant dem som spilte nok leker i den egenskapen til at det teller. */
export type SpesialistInnslag = {
  slag: "spesialist";
  tittel: string;
  emoji: string;
  tekst: string;
  userId: string;
  kvalitet: string;
  snitt: number;
  antall: number;
};

export type Innslag =
  | DuellInnslag
  | ReiseInnslag
  | RekordInnslag
  | RivalInnslag
  | LedertroyeInnslag
  | AvvikInnslag
  | TvillingInnslag
  | PodiumInnslag
  | PoengfestInnslag
  | TetsjiktInnslag
  | FormInnslag
  | SpesialistInnslag;

/** Øyeblikket der vinneren grep ledelsen for godt — vises rett før tidslinjen */
export type Vendepunkt = {
  tittel: string;
  emoji: string;
  tekst: string;
  userId: string;
  /** 1-basert stegnummer der ledelsen ble tatt; null = ledet fra start */
  ovelseNr: number | null;
};

export type Pris = {
  key: string;
  navn: string;
  emoji: string;
  begrunnelse: string;
  userId: string;
  verdi: string;
};

/** Hederlig omtale for deltakere som ellers ikke fikk et innslag */
export type Hederlig = {
  userId: string;
  stat: string;
};

export type FinaleData = {
  sesongNavn: string;
  aar: number;
  antallFullfort: number;
  antallOvelser: number;
  /** Hele sluttstillingen, vinneren først */
  deltakere: FinaleDeltaker[];
  tidslinje: TidslinjeSteg[];
  personer: Record<string, TidslinjePerson>;
  posisjoner: Posisjoner;
  /** Automatisk utvalgte innslag, ferdig sortert i fortellerrekkefølge */
  innslag: Innslag[];
  hederlige: Hederlig[];
  vendepunkt: Vendepunkt | null;
  priser: Pris[];
};

// ─── Utmerkelse-titler (speiler stilling-siden) ──────────────────

const UTMERKELSE_TITTEL: Record<string, string> = {
  seire: "Vinnermaskin",
  pall: "Pallhabitué",
  kamper: "Ironman",
  snitt: "Snittkongen",
  rekord: "Rekordholder",
  allsidig: "Multitalentet",
  vert: "Sjefsarrangør",
  uheldig: "Uflaks-magneten",
  trost: "Trøstepremien",
};

// ─── Småhjelpere ─────────────────────────────────────────────────

/** Standard poengskjema (speiler RankingRedigering): 1. plass = 10, 2. = 8, … */
const STANDARD_POENG = [10, 8, 6, 5, 4, 3, 2, 1];

/** Forventet total pott i en lek med n deltakere uten bonus/likhet — summen av
 *  standardpoengene for plass 1..n (0 fra 9. plass og ned). Brukes til å skille
 *  en ekte bonus-drevet «poengfest» fra en lek som bare hadde mange deltakere. */
function standardPott(n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += STANDARD_POENG[i] ?? 0;
  return sum;
}

function hashTall(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Velger deterministisk én av flere varianter, så teksten ikke hopper
 *  mellom visninger men likevel varierer mellom deltakere. */
function velg(userId: string, varianter: string[]): string {
  return varianter[hashTall(userId) % varianter.length];
}

function snitt(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdAvvik(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = snitt(xs);
  return Math.sqrt(snitt(xs.map((x) => (x - m) ** 2)));
}

/** Pearson-korrelasjon mellom to like lange tallserier; null hvis udefinert. */
function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = snitt(xs.slice(0, n));
  const my = snitt(ys.slice(0, n));
  let kov = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    kov += (xs[i] - mx) * (ys[i] - my);
    sx += (xs[i] - mx) ** 2;
    sy += (ys[i] - my) ** 2;
  }
  if (sx === 0 || sy === 0) return null;
  return kov / Math.sqrt(sx * sy);
}

/** Plassering innen én lek basert på poeng (delt plass ved likhet). */
function ovelseRanker(
  resultater: { userId: string; poeng: number }[],
): Map<string, number> {
  const sortert = [...resultater].sort((a, b) => b.poeng - a.poeng);
  const ranker = new Map<string, number>();
  sortert.forEach((r, i) => {
    const rank =
      i > 0 && r.poeng === sortert[i - 1].poeng
        ? ranker.get(sortert[i - 1].userId)!
        : i + 1;
    ranker.set(r.userId, rank);
  });
  return ranker;
}

// ─── Kommentar-generator ─────────────────────────────────────────

/** Lager en munter, deterministisk kommentar basert på statistikken. */
function lagKommentar(d: {
  userId: string;
  plass: number;
  sistePlass: number;
  seire: number;
  pall: number;
  utmerkelser: string[];
}): string {
  if (d.plass === 1) {
    return velg(d.userId, [
      "Suveren fra start til mål — bøy dere i støvet!",
      "Årets mester. Historiebøkene må skrives om!",
      "Total dominans. Resten kjempet om andreplassen!",
    ]);
  }
  if (d.seire >= 3) {
    return velg(d.userId, [
      `${d.seire} seire! En fryktet motstander i enhver lek.`,
      `${d.seire} førsteplasser — det lukter revansje neste år!`,
    ]);
  }
  if (d.utmerkelser.includes("Uflaks-magneten")) {
    return velg(d.userId, [
      "Uflaksen var en trofast følgesvenn i år — men humøret holdt hele veien!",
      "Terningen ville det annerledes. Neste år snur det!",
    ]);
  }
  if (d.pall >= 3 && d.seire === 0) {
    return velg(d.userId, [
      "Alltid på pallen, aldri øverst — den evige utfordreren!",
      `${d.pall} pallplasser uten seier. Så utrolig nære!`,
    ]);
  }
  if (d.plass === 2) {
    return velg(d.userId, [
      "Så nære gullet at det nesten gjør vondt. Sølv med glans!",
      "Årets nest beste — og neste års største trussel!",
    ]);
  }
  if (d.plass === 3) {
    return velg(d.userId, [
      "Bronse! En solid plass på pallen er aldri feil.",
      "Tredjeplass — pallen er nådd, gullet er innen rekkevidde!",
    ]);
  }
  if (d.plass === d.sistePlass) {
    return velg(d.userId, [
      "Noen må bygge pyramiden nedenfra — en sann grunnmur i lekene!",
      "Sist på lista, først i hjertene våre!",
      "Det viktigste er ikke å vinne, men å ha noen å slå neste år!",
    ]);
  }
  if (d.seire >= 1) {
    return velg(d.userId, [
      "Kriget til seg en seier og ga seg aldri — respekt!",
      "Viste glimt av ren klasse underveis!",
    ]);
  }
  return velg(d.userId, [
    "Jevn og trutt innsats gjennom hele lekene!",
    "Kjempet i hver eneste lek — heder og ære!",
    "En hederlig innsats som lover godt for neste år!",
  ]);
}

// ─── Innslagsalgoritmen ──────────────────────────────────────────
//
// Showet settes sammen helautomatisk: hver generator under produserer en
// KANDIDAT med en beregnet interessant-vekt (0–100) ut fra hvor dramatisk
// funnet faktisk er i dataene. Utvelgelsen plukker deretter de tyngste
// kandidatene med tre harde regler:
//   1. Variasjon: maks 2 duell-slides, maks 1 av hver annen visualisering
//   2. Dekning: alle deltakere skal være med i minst ett innslag eller en
//      pris — ellers utvides utvalget, og resten får hederlig omtale
//   3. Spoiler-vern: innslag som ville røpet sammenlagtvinneren (comeback,
//      fall, rival, sluttspurt) genereres aldri for vinneren

type Kandidat = {
  innslag: Innslag;
  vekt: number;
  visuell:
    | "duell"
    | "graf"
    | "fall"
    | "teller"
    | "rival"
    | "ribbon"
    | "tall"
    | "sparkline"
    | "podium"
    | "resultatliste"
    | "skala"
    | "form"
    | "spesialist";
  featured: string[];
  /** Kronologisk forankring (leksnummer) — null for sesong-overgripende innslag */
  kronNr: number | null;
};

const MAKS_INNSLAG = 9;
const MAKS_MED_DEKNING = 11;
// Duellen og formperioden har to lovlige varianter hver (stor/tett seier,
// hett/kaldt) — de kan derfor forekomme to ganger; alt annet maks én gang.
const VISUELL_MAKS: Record<string, number> = { duell: 2, form: 2 };
/** Fortellerrekkefølge for innslag som ikke er bundet til én lek */
const ARC_REKKEFOLGE = ["ribbon", "podium", "rival", "skala", "spesialist", "sparkline", "tall", "form", "fall", "graf"];

function velgInnslag(
  kandidater: Kandidat[],
  maaDekkes: Set<string>,
): { valgte: Kandidat[]; dekket: Set<string> } {
  const sortert = [...kandidater].sort((a, b) => b.vekt - a.vekt);
  const valgte: Kandidat[] = [];
  const brukt = new Map<string, number>();
  const tak = (visuell: string) => VISUELL_MAKS[visuell] ?? 1;
  const harPlass = (k: Kandidat) => (brukt.get(k.visuell) ?? 0) < tak(k.visuell);
  const registrer = (k: Kandidat) => brukt.set(k.visuell, (brukt.get(k.visuell) ?? 0) + 1);

  for (const k of sortert) {
    if (valgte.length >= MAKS_INNSLAG) break;
    if (!harPlass(k)) continue;
    valgte.push(k);
    registrer(k);
  }

  // ── Hard garanti: det BREDESTE fellesinnslaget er alltid med ──
  // "Noe artig med mange deltakere" er ryggraden i showet. Vi finner
  // kandidaten som favner flest deltakere (pall, poengfest, jordskjelv,
  // tetsjikt …) og sikrer at den er i utvalget — enten ved å legge den til
  // eller bytte ut det smaleste, svakeste innslaget. Finnes et innslag som
  // dekker ≥ 50 % av feltet, blir det dermed alltid vist; finnes det ikke
  // (f.eks. mange deltakere, få leker), vises i det minste det bredeste
  // som er mulig.
  const dekning = (k: Kandidat) => new Set(k.featured).size;
  const bredest = sortert.reduce<Kandidat | null>(
    (best, k) =>
      !best || dekning(k) > dekning(best) || (dekning(k) === dekning(best) && k.vekt > best.vekt)
        ? k
        : best,
    null,
  );
  if (bredest && dekning(bredest) >= 2 && !valgte.includes(bredest)) {
    const naaBredest = valgte.reduce((m, k) => Math.max(m, dekning(k)), 0);
    if (dekning(bredest) > naaBredest) {
      // Bytt alltid ut det smaleste, lavest vektede innslaget hvis den
      // bredeste ikke får plass innenfor visualiserings-taket — så vi aldri
      // dupliserer en visualisering for å få inn bredden.
      if (valgte.length < MAKS_INNSLAG && harPlass(bredest)) {
        valgte.push(bredest);
        registrer(bredest);
      } else {
        let verstIdx = 0;
        for (let i = 1; i < valgte.length; i++) {
          const d = dekning(valgte[i]);
          const dv = dekning(valgte[verstIdx]);
          if (d < dv || (d === dv && valgte[i].vekt < valgte[verstIdx].vekt)) verstIdx = i;
        }
        const ut = valgte[verstIdx];
        brukt.set(ut.visuell, (brukt.get(ut.visuell) ?? 1) - 1);
        valgte[verstIdx] = bredest;
        registrer(bredest);
      }
    }
  }

  // Dekningsutvidelse: slipp inn ekstra kandidater som featurer folk uten
  // innslag — men aldri på bekostning av variasjonen (visualiserings-taket
  // gjelder fortsatt). Den som likevel ikke får plass, dekkes av hederlig
  // omtale i stedet.
  const dekket = new Set(valgte.flatMap((k) => k.featured));
  for (const k of sortert) {
    if (valgte.length >= MAKS_MED_DEKNING) break;
    if (valgte.includes(k) || !harPlass(k)) continue;
    if (k.featured.some((u) => maaDekkes.has(u) && !dekket.has(u))) {
      valgte.push(k);
      registrer(k);
      for (const u of k.featured) dekket.add(u);
    }
  }

  // Fortellerrekkefølge: leksbundne innslag kronologisk, resten i fast dramaturgi
  valgte.sort((a, b) => {
    if (a.kronNr !== null && b.kronNr !== null) return a.kronNr - b.kronNr;
    if (a.kronNr !== null) return -1;
    if (b.kronNr !== null) return 1;
    return ARC_REKKEFOLGE.indexOf(a.visuell) - ARC_REKKEFOLGE.indexOf(b.visuell);
  });

  return { valgte, dekket };
}

// ─── Datainnsamling ──────────────────────────────────────────────

type KronOvelse = {
  nr: number;
  navn: string;
  kvaliteter: Kvalitet[];
  /** Alle poeng i leken (individuelle + lagmedlemmer), usortert */
  resultater: { userId: string; poeng: number }[];
};

/** Rå leksrad slik den pure byggeren trenger den — speiler Prisma-selecten
 *  i hentFinaleData, men uten Prisma, så logikken kan testes isolert. */
export type FinaleOvelseRad = {
  id: string;
  navn: string;
  kvaliteter: Kvalitet[];
  vertId: string;
  fullfortTid: Date | null;
  createdAt: Date;
  individuelleResultater: { userId: string; poeng: number }[];
  lag: {
    resultat: { poeng: number } | null;
    medlemmer: { userId: string }[];
  }[];
};

/** Bygger alt finaleshowet trenger i én pakke — helautomatisk. Innslagene
 *  velges av algoritmen over, tidslinjen sorteres på fullfortTid (med
 *  createdAt som fallback for leker fullført før tidsstempelet fantes). */
export async function hentFinaleData(sesong: {
  id: string;
  navn: string;
  aar: number;
}): Promise<FinaleData> {
  const [sesongData, ovelser, antallOvelser] = await Promise.all([
    hentAlleSesongData(sesong.id),
    prisma.ovelse.findMany({
      where: { sesongId: sesong.id, status: "FULLFORT" },
      select: {
        id: true,
        navn: true,
        kvaliteter: true,
        vertId: true,
        fullfortTid: true,
        createdAt: true,
        individuelleResultater: { select: { userId: true, poeng: true } },
        lag: {
          select: {
            resultat: { select: { poeng: true } },
            medlemmer: { select: { userId: true } },
          },
        },
      },
    }),
    prisma.ovelse.count({ where: { sesongId: sesong.id } }),
  ]);

  return byggFinaleData(sesong, sesongData, ovelser, antallOvelser);
}

/** Ren, Prisma-fri kjerne: tar rådata og bygger hele FinaleData. Skilt ut
 *  fra hentFinaleData så invariantene (alltid vinner, alltid et bredt
 *  innslag, full dekning, variasjon) kan bevises i test uten database. */
export function byggFinaleData(
  sesong: { navn: string; aar: number },
  sesongData: SesongData,
  ovelser: FinaleOvelseRad[],
  antallOvelser: number,
): FinaleData {
  // Kun FULLFØRTE leker teller i finalen. Planlagte/påbegynte leker som ikke
  // ble ferdige holdes HELT utenfor — også fra sammendraget, poengsummer og
  // utmerkelser, ikke bare fra tidslinjen. (`ovelser` er allerede filtrert til
  // FULLFORT i spørringen; her speiler vi det inn i stats-grunnlaget.)
  const fullfortIds = new Set(ovelser.map((o) => o.id));
  const bareFullfort: SesongData = {
    brukere: sesongData.brukere.map((b) => ({
      ...b,
      individuelleResultater: b.individuelleResultater.filter((r) =>
        fullfortIds.has(r.ovelseId),
      ),
      lagmedlemskap: b.lagmedlemskap.filter((m) => fullfortIds.has(m.lag.ovelseId)),
    })),
    vertPerOvelse: ovelser.map((o) => ({ vertId: o.vertId })),
  };

  const stilling = hentStilling(bareFullfort);
  const detaljer = hentSpillerdetaljer(bareFullfort);
  const utmerkelser = hentUtmerkelser(bareFullfort);

  // Navn/farger slås opp fra ALLE brukere (superset) så avatarer alltid rendrer
  const personer: Record<string, TidslinjePerson> = {};
  for (const b of sesongData.brukere) {
    personer[b.id] = {
      navn: b.navn,
      fornavn: b.navn.trim().split(/\s+/)[0] ?? b.navn,
      farge: b.farge,
      bildeUrl: b.bildeUrl,
    };
  }
  const fornavnAv = (userId: string) => personer[userId]?.fornavn ?? "?";

  // ─── Kronologisk liste over fullførte leker med alle resultater ──
  const kronologisk: KronOvelse[] = [...ovelser]
    .sort(
      (a, b) =>
        (a.fullfortTid ?? a.createdAt).getTime() -
        (b.fullfortTid ?? b.createdAt).getTime(),
    )
    .map((o, i) => {
      const resultater: { userId: string; poeng: number }[] = [
        ...o.individuelleResultater.map((r) => ({
          userId: r.userId,
          poeng: r.poeng,
        })),
      ];
      for (const lag of o.lag) {
        if (!lag.resultat) continue;
        for (const m of lag.medlemmer) {
          resultater.push({ userId: m.userId, poeng: lag.resultat.poeng });
        }
      }
      return { nr: i + 1, navn: o.navn, kvaliteter: o.kvaliteter, resultater };
    });

  // ─── Sluttstilling med plass (delt plass ved poenglikhet) ──────
  const medPoeng = stilling.filter((r) => r.totalPoeng > 0 || r.antallOvelser > 0);
  const plasser: number[] = [];
  medPoeng.forEach((r, i) => {
    plasser[i] =
      i > 0 && r.totalPoeng === medPoeng[i - 1].totalPoeng ? plasser[i - 1] : i + 1;
  });
  const sistePlass = plasser[plasser.length - 1] ?? 1;
  const sluttPlassAv = new Map(medPoeng.map((r, i) => [r.userId, plasser[i]]));
  const totalPoengAv = new Map(medPoeng.map((r) => [r.userId, r.totalPoeng]));
  const vinnerId = medPoeng[0]?.userId;

  // ─── Tidslinje: kumulativ stilling etter hver fullførte lek ──
  // Ved poenglikhet må tidslinjen rangere likt som sluttstillingen, ellers
  // kan "feil" person ha kronen på siste steg. hentStilling bruker stabil
  // sortering over brukerlisten, så vi gjenbruker samme rekkefølge her.
  const brukerIndeks = new Map(sesongData.brukere.map((b, i) => [b.id, i]));

  const kumulativ = new Map<string, number>();
  let forrigeLeder: string | null = null;
  const tidslinje: TidslinjeSteg[] = kronologisk.map((o) => {
    for (const r of o.resultater) {
      kumulativ.set(r.userId, (kumulativ.get(r.userId) ?? 0) + r.poeng);
    }
    const sortert = [...kumulativ.entries()]
      .map(([userId, poeng]) => ({ userId, poeng }))
      .sort(
        (a, b) =>
          b.poeng - a.poeng ||
          (brukerIndeks.get(a.userId) ?? 0) - (brukerIndeks.get(b.userId) ?? 0),
      );
    const lederId = sortert[0]?.userId ?? null;
    const lederbytte = lederId !== null && lederId !== forrigeLeder;
    forrigeLeder = lederId ?? forrigeLeder;
    return {
      nr: o.nr,
      ovelseNavn: o.navn,
      stilling: sortert,
      lederId,
      lederbytte,
    };
  });

  // ─── Posisjonshistorikk: kumulativ plass per deltaker per steg ──
  const posisjoner: Posisjoner = {
    ovelser: tidslinje.map((t) => t.ovelseNavn),
    serier: medPoeng.map((r) => ({
      userId: r.userId,
      ranks: tidslinje.map((steg) => {
        const i = steg.stilling.findIndex((s) => s.userId === r.userId);
        return i === -1 ? null : i + 1;
      }),
    })),
  };

  // Plassering innen hver enkelt lek, per bruker
  const ovelseRankerAlle = kronologisk.map((o) => ({
    o,
    ranker: ovelseRanker(o.resultater),
  }));
  const ranksFor = (userId: string, filter?: (o: KronOvelse) => boolean) =>
    ovelseRankerAlle
      .filter(({ o }) => (filter ? filter(o) : true))
      .map(({ ranker }) => ranker.get(userId))
      .filter((r): r is number => r !== undefined);

  // ─── Deltakerliste ──────────────────────────────────────────────
  const deltakere: FinaleDeltaker[] = medPoeng.map((r, i) => {
    const d = detaljer[r.userId];
    const mine = utmerkelser
      .filter((u) => u.leder?.userId === r.userId)
      .map((u) => UTMERKELSE_TITTEL[u.key])
      .filter(Boolean);

    // Pallplasser hentes fra utmerkelses-tallgrunnlaget ("3 pallplasser")
    const pallUtm = utmerkelser.find((u) => u.key === "pall");
    const pallVerdi = pallUtm?.alle.find((a) => a.userId === r.userId)?.verdi;
    const pall = pallVerdi ? parseInt(pallVerdi, 10) || 0 : 0;

    let besteOvelse: FinaleDeltaker["besteOvelse"] = null;
    for (const o of kronologisk) {
      const egen = o.resultater.find((x) => x.userId === r.userId);
      if (egen && (!besteOvelse || egen.poeng > besteOvelse.poeng)) {
        besteOvelse = { navn: o.navn, poeng: egen.poeng };
      }
    }

    return {
      userId: r.userId,
      navn: r.navn,
      fornavn: fornavnAv(r.userId),
      bildeUrl: r.bildeUrl,
      farge: r.farge,
      plass: plasser[i],
      totalPoeng: r.totalPoeng,
      antallOvelser: r.antallOvelser,
      seire: d?.seire ?? 0,
      pall,
      rekord: d?.rekord ?? 0,
      snitt: d?.snitt ?? 0,
      besteKvalitet: d?.kvaliteter[0] ? kvalitetTekst[d.kvaliteter[0].kvalitet] : null,
      utmerkelser: mine,
      kommentar: lagKommentar({
        userId: r.userId,
        plass: plasser[i],
        sistePlass,
        seire: d?.seire ?? 0,
        pall,
        utmerkelser: mine,
      }),
      besteOvelse,
    };
  });

  // ─── Kandidat-generatorer ───────────────────────────────────────
  const kandidater: Kandidat[] = [];

  // Poengskjemaet er fast: 1. plass gir 10, 2. plass 8, 3. plass 6, … så den
  // NORMALE avstanden mellom to nabo­plasseringer er 2 poeng. Marginbaserte
  // innslag må derfor slå klart utenom dette for å bety noe — ellers ender vi
  // opp med å kalle et helt vanlig napp både en «maktdemonstrasjon» og en
  // «fotofinish» (samme 2-poengs luke), som ikke gir mening. En ekte storseier
  // krever minst to plasseringers forsprang (≥ 4 p, typisk via bonuspoeng), og
  // en ekte fotofinish krever tettere enn ett hakk (uavgjort eller bonusbrøk).
  const STORSEIER_MIN_MARGIN = 4;
  const THRILLER_MAKS_MARGIN = 1;

  // Margindata per lek med minst to deltakere
  const dueller = kronologisk
    .filter((o) => o.resultater.length >= 2)
    .map((o) => {
      const sortert = [...o.resultater].sort((a, b) => b.poeng - a.poeng);
      return {
        o,
        vinner: sortert[0],
        toer: sortert[1],
        sisteMann: sortert[sortert.length - 1],
        margin: sortert[0].poeng - sortert[1].poeng,
        knockout: sortert[0].poeng - sortert[sortert.length - 1].poeng,
      };
    });

  // Maktdemonstrasjonen: største seiersmargin — men bare når noen faktisk
  // dro klart fra feltet (≥ to plasseringers forsprang), ikke et vanlig napp.
  const storseier = dueller
    .filter((d) => d.margin >= STORSEIER_MIN_MARGIN)
    .reduce<(typeof dueller)[number] | null>(
      (m, d) => (!m || d.margin > m.margin ? d : m),
      null,
    );
  if (storseier) {
    kandidater.push({
      vekt: Math.min(85, 45 + storseier.margin * 4),
      visuell: "duell",
      featured: [storseier.vinner.userId, storseier.toer.userId],
      kronNr: storseier.o.nr,
      innslag: {
        slag: "duell",
        variant: "storseier",
        tittel: "Maktdemonstrasjonen",
        emoji: "💪",
        tekst: `I «${storseier.o.navn}» knuste ${fornavnAv(storseier.vinner.userId)} all motstand — hele ${storseier.margin} poeng foran ${fornavnAv(storseier.toer.userId)} på andreplass.`,
        ovelseNavn: storseier.o.navn,
        ovelseNr: storseier.o.nr,
        vinner: storseier.vinner,
        taper: storseier.toer,
      },
    });
  }

  // Fotofinishen: minste margin (i en annen lek enn storseieren) — men bare
  // når det virkelig var tett (uavgjort eller under ett plasseringshakk).
  // Et standard 2-poengs napp er ikke en fotofinish, det er bare en seier.
  const thriller = dueller
    .filter((d) => d.o.nr !== storseier?.o.nr)
    .reduce<(typeof dueller)[number] | null>(
      (m, d) => (!m || d.margin < m.margin ? d : m),
      null,
    );
  if (
    thriller &&
    thriller.margin <= THRILLER_MAKS_MARGIN &&
    (!storseier || thriller.margin < storseier.margin)
  ) {
    kandidater.push({
      vekt: Math.max(30, 72 - thriller.margin * 8),
      visuell: "duell",
      featured: [thriller.vinner.userId, thriller.toer.userId],
      kronNr: thriller.o.nr,
      innslag: {
        slag: "duell",
        variant: "thriller",
        tittel: "Fotofinishen",
        emoji: "📸",
        tekst:
          thriller.margin === 0
            ? `«${thriller.o.navn}» endte i dødt løp — ${fornavnAv(thriller.vinner.userId)} og ${fornavnAv(thriller.toer.userId)} var ikke til å skille!`
            : `«${thriller.o.navn}» ble avgjort med knappe ${thriller.margin} poeng — ${fornavnAv(thriller.vinner.userId)} snek seg forbi ${fornavnAv(thriller.toer.userId)} på målstreken.`,
        ovelseNavn: thriller.o.navn,
        ovelseNr: thriller.o.nr,
        vinner: thriller.vinner,
        taper: thriller.toer,
      },
    });
  }

  // Oppgjøret / Den store smellen: leken med størst sprik fra 1. til sist.
  // Er spriket reelt stort (≥ 6 p) er det en ekte «smell» med dempet ordlyd
  // som feirer vinneren framfor å henge ut sisteplassen; ellers vises det som
  // et nøkternt oppgjør. Dette innslaget er samtidig showets brede sikkerhets-
  // nett i små felt (to spillere per lek), der en duell ER hele feltet.
  const KNOCKOUT_STOR_SPRIK = 6;
  const knockout = dueller
    .filter((d) => d.o.nr !== storseier?.o.nr && d.knockout > 0)
    .reduce<(typeof dueller)[number] | null>(
      (m, d) => (!m || d.knockout > m.knockout ? d : m),
      null,
    );
  if (knockout) {
    const stor = knockout.knockout >= KNOCKOUT_STOR_SPRIK;
    kandidater.push({
      vekt: stor
        ? Math.min(78, 40 + knockout.knockout * 2.5)
        : Math.min(48, 26 + knockout.knockout * 3),
      visuell: "duell",
      featured: [knockout.vinner.userId, knockout.sisteMann.userId],
      kronNr: knockout.o.nr,
      innslag: {
        slag: "duell",
        variant: stor ? "knockout" : "oppgjor",
        tittel: stor ? "Den store smellen" : "Oppgjøret",
        emoji: stor ? "💥" : "🥊",
        tekst: stor
          ? `I «${knockout.o.navn}» var ${fornavnAv(knockout.vinner.userId)} i en klasse for seg — ${knockout.knockout} poeng klar av nederst på lista. En real opptur!`
          : `«${knockout.o.navn}» ble et rent oppgjør: ${fornavnAv(knockout.vinner.userId)} slo ${fornavnAv(knockout.sisteMann.userId)} med ${knockout.knockout} poeng.`,
        ovelseNavn: knockout.o.navn,
        ovelseNr: knockout.o.nr,
        vinner: knockout.vinner,
        taper: knockout.sisteMann,
      },
    });
  }

  // Årets comeback og Det frie fallet (krever minst 3 steg for en ekte reise).
  // Vinneren holdes utenfor — en comeback "helt til 1. plass" ville røpet kåringen.
  if (tidslinje.length >= 3) {
    let comeback: { userId: string; klatring: number; bunn: number; bunnSteg: number } | null = null;
    let kollaps: { userId: string; fall: number; topp: number; toppSteg: number } | null = null;

    for (const serie of posisjoner.serier) {
      if (serie.userId === vinnerId) continue;
      const slutt = sluttPlassAv.get(serie.userId);
      if (slutt === undefined) continue;
      for (let steg = 0; steg < serie.ranks.length - 1; steg++) {
        const rank = serie.ranks[steg];
        if (rank === null) continue;
        const klatring = rank - slutt;
        if (klatring >= 2 && (!comeback || klatring > comeback.klatring)) {
          comeback = { userId: serie.userId, klatring, bunn: rank, bunnSteg: steg };
        }
        const fall = slutt - rank;
        if (fall >= 2 && (!kollaps || fall > kollaps.fall)) {
          kollaps = { userId: serie.userId, fall, topp: rank, toppSteg: steg };
        }
      }
    }

    if (comeback) {
      const c = comeback;
      kandidater.push({
        vekt: Math.min(88, 52 + c.klatring * 9),
        visuell: "graf",
        featured: [c.userId],
        kronNr: null,
        innslag: {
          slag: "comeback",
          tittel: "Årets comeback",
          emoji: "🚀",
          tekst: `Etter «${tidslinje[c.bunnSteg].ovelseNavn}» lå ${fornavnAv(c.userId)} helt nede på ${c.bunn}. plass. Så snudde alt — ${c.klatring} plasser opp, til ${sluttPlassAv.get(c.userId)}. plass i sammendraget!`,
          userId: c.userId,
          fra: c.bunn,
          til: sluttPlassAv.get(c.userId) ?? c.bunn,
        },
      });
    }
    if (kollaps && (!comeback || kollaps.userId !== comeback.userId)) {
      const k = kollaps;
      kandidater.push({
        vekt: Math.min(88, 50 + k.fall * 9),
        visuell: "fall",
        featured: [k.userId],
        kronNr: null,
        innslag: {
          slag: "fall",
          tittel: "Det frie fallet",
          emoji: "🎢",
          tekst: `${fornavnAv(k.userId)} var oppe på ${k.topp}. plass etter «${tidslinje[k.toppSteg].ovelseNavn}» — men slutten ble tung: ${k.fall} plasser ned, til ${sluttPlassAv.get(k.userId)}. plass.`,
          userId: k.userId,
          fra: k.topp,
          til: sluttPlassAv.get(k.userId) ?? k.topp,
        },
      });
    }
  }

  // Rekorden: sesongens høyeste enkeltscore. Hopper over kandidater som
  // allerede er hovedpersonen i en duell i samme lek — unngår reprise.
  {
    const duellVinnere = new Set(
      [storseier, thriller, knockout]
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => `${d.o.nr}:${d.vinner.userId}`),
    );
    const alle = kronologisk
      .flatMap((o) => o.resultater.map((r) => ({ o, ...r })))
      .filter((r) => r.poeng > 0)
      .sort((a, b) => b.poeng - a.poeng);
    // Med standard poengskjema får hver leksvinner samme sum — en
    // "rekord" er bare ekte hvis nøyaktig ett resultat holder toppverdien
    const erEkteRekord =
      alle.length > 0 && alle.filter((r) => r.poeng === alle[0].poeng).length === 1;
    const rekord = erEkteRekord
      ? alle.find((r) => !duellVinnere.has(`${r.o.nr}:${r.userId}`))
      : undefined;
    if (rekord) {
      kandidater.push({
        vekt: Math.min(60, 35 + rekord.poeng * 0.8),
        visuell: "teller",
        featured: [rekord.userId],
        kronNr: rekord.o.nr,
        innslag: {
          slag: "rekord",
          tittel: "Rekorden",
          emoji: "🔥",
          tekst: `Ingen enkeltprestasjon ga mer enn da ${fornavnAv(rekord.userId)} håvet inn ${rekord.poeng} poeng i «${rekord.o.navn}». Sesongens høyeste enkeltscore!`,
          userId: rekord.userId,
          poeng: rekord.poeng,
          ovelseNavn: rekord.o.navn,
        },
      });
    }
  }

  // Rivaloppgjøret: de to jevneste i sammendraget (utenom vinneren),
  // fortalt gjennom innbyrdes oppgjør lek for lek.
  {
    const ikkeVinnere = medPoeng.filter((r) => r.userId !== vinnerId);
    let besteRival: {
      aId: string;
      bId: string;
      diff: number;
      runder: { ovelseNavn: string; utfall: "A" | "B" | "U" }[];
    } | null = null;
    for (let i = 0; i < ikkeVinnere.length; i++) {
      for (let j = i + 1; j < ikkeVinnere.length; j++) {
        const a = ikkeVinnere[i].userId;
        const b = ikkeVinnere[j].userId;
        const runder: { ovelseNavn: string; utfall: "A" | "B" | "U" }[] = [];
        for (const o of kronologisk) {
          const ra = o.resultater.find((x) => x.userId === a);
          const rb = o.resultater.find((x) => x.userId === b);
          if (!ra || !rb) continue;
          runder.push({
            ovelseNavn: o.navn,
            utfall: ra.poeng > rb.poeng ? "A" : rb.poeng > ra.poeng ? "B" : "U",
          });
        }
        if (runder.length < 3) continue;
        const diff = Math.abs(
          (totalPoengAv.get(a) ?? 0) - (totalPoengAv.get(b) ?? 0),
        );
        if (
          !besteRival ||
          diff < besteRival.diff ||
          (diff === besteRival.diff && runder.length > besteRival.runder.length)
        ) {
          besteRival = { aId: a, bId: b, diff, runder };
        }
      }
    }
    if (besteRival) {
      const r = besteRival;
      const aSeire = r.runder.filter((x) => x.utfall === "A").length;
      const bSeire = r.runder.filter((x) => x.utfall === "B").length;
      const uavgjort = r.runder.length - aSeire - bSeire;
      kandidater.push({
        // Basisvekten holdes moderat: par-innslag skal ikke utkonkurrere
        // innslagene som får med seg mange deltakere på én gang
        vekt: Math.min(76, 62 - r.diff * 4 + r.runder.length),
        visuell: "rival",
        featured: [r.aId, r.bId],
        kronNr: null,
        innslag: {
          slag: "rival",
          tittel: "Rivaloppgjøret",
          emoji: "⚔️",
          tekst: `Bare ${r.diff === 0 ? "null" : r.diff} poeng skiller ${fornavnAv(r.aId)} og ${fornavnAv(r.bId)} i sammendraget. Innbyrdes endte det ${aSeire}–${bSeire}${uavgjort ? ` (og ${uavgjort} uavgjort)` : ""} over ${r.runder.length} dueller.`,
          aId: r.aId,
          bId: r.bId,
          aSeire,
          bSeire,
          uavgjort,
          runder: r.runder,
        },
      });
    }
  }

  // Ledertrøya: hvem toppet sammendraget flest etapper — mest verdt når
  // trøya faktisk skiftet eier underveis. Spoiler-vern: bar den kommende
  // vinneren trøya flest etapper, ville innslaget røpet kåringen midt i
  // «Historien», så da hopper vi over det (den historien fortelles uansett av
  // vendepunktet rett før kåringen). Da featurer vi bare en «falsk leder» som
  // gikk foran en stund, men ble forbigått — som også peker bort fra vinneren.
  if (tidslinje.length >= 2) {
    const antallPerLeder = new Map<string, number>();
    for (const steg of tidslinje) {
      if (steg.lederId) {
        antallPerLeder.set(steg.lederId, (antallPerLeder.get(steg.lederId) ?? 0) + 1);
      }
    }
    const topp = [...antallPerLeder.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topp && topp[0] !== vinnerId) {
      const bytter = tidslinje.filter((s, i) => i > 0 && s.lederbytte).length;
      kandidater.push({
        vekt: Math.min(80, 34 + bytter * 9),
        visuell: "ribbon",
        featured: [topp[0]],
        kronNr: null,
        innslag: {
          slag: "ledertroye",
          tittel: "Ledertrøya",
          emoji: "👑",
          tekst:
            bytter === 0
              ? `${fornavnAv(topp[0])} bar ledertrøya gjennom samtlige ${tidslinje.length} etapper. Ingen fikk låne den engang.`
              : `Trøya skiftet eier ${bytter} ganger — men ingen bar den lenger enn ${fornavnAv(topp[0])}, med ${topp[1]} av ${tidslinje.length} etapper.`,
          userId: topp[0],
          antall: topp[1],
        },
      });
    }
  }

  // Sjokkresultatet (dypere matte): resultatet som avviker mest fra
  // personens eget nivå, målt i standardavvik over egne plasseringer.
  {
    let sjokk: { userId: string; o: KronOvelse; rank: number; snittRank: number; z: number } | null = null;
    for (const r of medPoeng) {
      const ranks = ranksFor(r.userId);
      if (ranks.length < 4) continue;
      const m = snitt(ranks);
      const s = stdAvvik(ranks);
      if (s < 0.5) continue;
      for (const { o, ranker } of ovelseRankerAlle) {
        const rank = ranker.get(r.userId);
        if (rank === undefined) continue;
        const z = (m - rank) / s;
        if (z >= 1.3 && (!sjokk || z > sjokk.z)) {
          sjokk = { userId: r.userId, o, rank, snittRank: m, z };
        }
      }
    }
    if (sjokk) {
      const s = sjokk;
      kandidater.push({
        vekt: Math.min(86, 40 + s.z * 14),
        visuell: "tall",
        featured: [s.userId],
        kronNr: s.o.nr,
        innslag: {
          slag: "avvik",
          variant: "sjokk",
          tittel: "Ingen så det komme",
          emoji: "🤯",
          tekst: `Til vanlig endte ${fornavnAv(s.userId)} rundt ${s.snittRank.toFixed(1)}. plass — men i «${s.o.navn}» smalt det plutselig til ${s.rank}. plass. Årets største overraskelse!`,
          userId: s.userId,
          fraVerdi: `${s.snittRank.toFixed(1)}.`,
          fraLabel: "pleier å ende",
          tilVerdi: `${s.rank}.`,
          tilLabel: `plass i «${s.o.navn}»`,
        },
      });
    }
  }

  // Sluttspurten (dypere matte): størst fremgang fra første til andre
  // halvdel av sesongen. Vinneren holdes utenfor — spoiler-vern.
  {
    let spurt: { userId: string; foer: number; etter: number; delta: number } | null = null;
    for (const r of medPoeng) {
      if (r.userId === vinnerId) continue;
      const ranks = ranksFor(r.userId);
      if (ranks.length < 4) continue;
      const halv = Math.ceil(ranks.length / 2);
      const foer = snitt(ranks.slice(0, halv));
      const etter = snitt(ranks.slice(halv));
      const delta = foer - etter;
      if (delta >= 1.5 && (!spurt || delta > spurt.delta)) {
        spurt = { userId: r.userId, foer, etter, delta };
      }
    }
    if (spurt) {
      const s = spurt;
      kandidater.push({
        vekt: Math.min(80, 38 + s.delta * 9),
        visuell: "tall",
        featured: [s.userId],
        kronNr: null,
        innslag: {
          slag: "avvik",
          variant: "sluttspurt",
          tittel: "Sluttspurten",
          emoji: "🏃",
          tekst: `${fornavnAv(s.userId)} våknet da det gjaldt: fra ${s.foer.toFixed(1)}. plass i snitt i første halvdel til ${s.etter.toFixed(1)}. i andre — en fremgang på ${s.delta.toFixed(1)} plasser per lek.`,
          userId: s.userId,
          fraVerdi: `${s.foer.toFixed(1)}.`,
          fraLabel: "snittplass, første halvdel",
          tilVerdi: `${s.etter.toFixed(1)}.`,
          tilLabel: "snittplass, andre halvdel",
        },
      });
    }
  }

  // Tvillingene / Motpolene (dypere matte): parene med mest korrelerte
  // eller mest motsatte plasseringsrytmer (Pearson over felles leker).
  {
    let besteKorr: { aId: string; bId: string; r: number; aRanks: number[]; bRanks: number[] } | null = null;
    for (let i = 0; i < medPoeng.length; i++) {
      for (let j = i + 1; j < medPoeng.length; j++) {
        const a = medPoeng[i].userId;
        const b = medPoeng[j].userId;
        const aR: number[] = [];
        const bR: number[] = [];
        for (const { ranker } of ovelseRankerAlle) {
          const ra = ranker.get(a);
          const rb = ranker.get(b);
          if (ra === undefined || rb === undefined) continue;
          aR.push(ra);
          bR.push(rb);
        }
        if (aR.length < 4) continue;
        const r = pearson(aR, bR);
        if (r === null) continue;
        if (Math.abs(r) >= 0.65 && (!besteKorr || Math.abs(r) > Math.abs(besteKorr.r))) {
          besteKorr = { aId: a, bId: b, r, aRanks: aR, bRanks: bR };
        }
      }
    }
    if (besteKorr) {
      const k = besteKorr;
      const positiv = k.r > 0;
      const prosent = Math.round(Math.abs(k.r) * 100);
      kandidater.push({
        vekt: Math.min(75, 30 + Math.abs(k.r) * 45),
        visuell: "sparkline",
        featured: [k.aId, k.bId],
        kronNr: null,
        innslag: {
          slag: "tvillinger",
          variant: positiv ? "tvillinger" : "motpoler",
          tittel: positiv ? "Tvillingene" : "Motpolene",
          emoji: positiv ? "👯" : "🧲",
          tekst: positiv
            ? `Tallene avslører noe rart: ${fornavnAv(k.aId)} og ${fornavnAv(k.bId)} fulgte hverandre som skygger. Gikk den ene opp, gikk den andre opp — de gikk i takt ${prosent} % av lekene.`
            : `Tallene avslører noe rart: ${fornavnAv(k.aId)} og ${fornavnAv(k.bId)} er rene motpoler. Når den ene gjorde det bra, slet den andre — de gikk i utakt ${prosent} % av lekene.`,
          aId: k.aId,
          bId: k.bId,
          aRanks: k.aRanks,
          bRanks: k.bRanks,
          prosent,
        },
      });
    }
  }

  // Kvalitetspallen (Mario Party-kåring): topp tre innen egenskapen med
  // flest leker denne sesongen — et innslag som løfter tre deltakere.
  {
    const antallPerKvalitet = new Map<Kvalitet, number>();
    for (const o of kronologisk) {
      for (const k of o.kvaliteter) {
        antallPerKvalitet.set(k, (antallPerKvalitet.get(k) ?? 0) + 1);
      }
    }
    const beste = [...antallPerKvalitet.entries()].sort((a, b) => b[1] - a[1])[0];
    if (beste) {
      const [kvalitet, antallLeker] = beste;
      const ledere = hentKvalitetsledere(bareFullfort).find((k) => k.kvalitet === kvalitet);
      const topp = (ledere?.topp3 ?? []).map((t) => ({ userId: t.userId, poeng: t.poeng }));
      if (topp.length >= 3) {
        const label = kvalitetTekst[kvalitet];
        kandidater.push({
          // Vektes høyt: tre deltakere på pallen i ett innslag
          vekt: Math.min(78, 64 + antallLeker * 4),
          visuell: "podium",
          featured: topp.map((t) => t.userId),
          kronNr: null,
          innslag: {
            slag: "podium",
            tittel: label,
            emoji: "🏅",
            tekst: `${antallLeker === 1 ? "Én lek" : `${antallLeker} leker`} testet ${label.toLowerCase()} i år — og der hersket ${fornavnAv(topp[0].userId)}, med ${fornavnAv(topp[1].userId)} og ${fornavnAv(topp[2].userId)} hakk i hæl.`,
            kvalitet: label,
            topp,
          },
        });
      }
    }
  }

  // Poengfesten: leken der det ble delt ut MER poeng enn skjemaet tilsier.
  // Med fast poengskjema er den «største potten» ellers bare leken med flest
  // deltakere — ikke en ekte fest. Vi ser derfor på hvor mye potten oversteg
  // standardpotten for feltstørrelsen (dvs. bonuspoeng), og krever et reelt
  // bonuspåslag. Er det ingen bonus, tar Jordskjelvet «hele feltet»-plassen.
  const POENGFEST_MIN_BONUS = 5;
  {
    const potter = kronologisk
      .filter((o) => o.resultater.length >= 3)
      .map((o) => {
        const total = o.resultater.reduce((sum, r) => sum + r.poeng, 0);
        return { o, total, bonus: total - standardPott(o.resultater.length) };
      })
      .sort((a, b) => b.bonus - a.bonus);
    const fest = potter[0];
    if (fest && fest.bonus >= POENGFEST_MIN_BONUS) {
      const resultater = [...fest.o.resultater].sort((a, b) => b.poeng - a.poeng);
      kandidater.push({
        // Vektes høyt: hele feltet på én gang, à la resultatskjermen i Mario Party
        vekt: Math.min(78, 56 + resultater.length * 4),
        visuell: "resultatliste",
        featured: resultater.map((r) => r.userId),
        kronNr: fest.o.nr,
        innslag: {
          slag: "poengfest",
          variant: "poengfest",
          tittel: "Poengfesten",
          emoji: "🎆",
          tekst: `«${fest.o.navn}» var årets gavebord: ${fest.total} poeng i potten — hele ${fest.bonus} mer enn skjemaet tilsier, takket være bonuspoeng.`,
          undertekst: `+${fest.bonus} bonuspoeng i potten`,
          ovelseNavn: fest.o.navn,
          ovelseNr: fest.o.nr,
          resultater,
        },
      });
    }
  }

  // Jordskjelvet: leken som ristet sammendraget mest — målt i hvor
  // mange plasseringer som byttet eier da støvet la seg. Robust også når
  // alle leker deler ut samme pott, og får med hele feltet på én gang.
  {
    let skjelv: { steg: number; sum: number; flyttet: number; endring: Map<string, number> } | null = null;
    for (let i = 1; i < tidslinje.length; i++) {
      const foer = new Map(tidslinje[i - 1].stilling.map((s, idx) => [s.userId, idx + 1]));
      const etter = new Map(tidslinje[i].stilling.map((s, idx) => [s.userId, idx + 1]));
      const endring = new Map<string, number>();
      let sum = 0;
      let flyttet = 0;
      for (const [userId, naaRank] of etter) {
        const foerRank = foer.get(userId);
        if (foerRank === undefined) continue;
        const delta = foerRank - naaRank; // positiv = klatret
        endring.set(userId, delta);
        sum += Math.abs(delta);
        if (delta !== 0) flyttet += 1;
      }
      if (sum >= 3 && (!skjelv || sum > skjelv.sum)) {
        skjelv = { steg: i, sum, flyttet, endring };
      }
    }
    if (skjelv) {
      const s = skjelv;
      const o = kronologisk[s.steg];
      const resultater = [...o.resultater]
        .sort((a, b) => b.poeng - a.poeng)
        .map((r) => ({ ...r, endring: s.endring.get(r.userId) ?? 0 }));
      kandidater.push({
        vekt: Math.min(80, 50 + s.sum * 3),
        visuell: "resultatliste",
        featured: resultater.map((r) => r.userId),
        kronNr: o.nr,
        innslag: {
          slag: "poengfest",
          variant: "jordskjelv",
          tittel: "Jordskjelvet",
          emoji: "🌋",
          tekst: `Da støvet la seg etter «${o.navn}» hadde tabellen fått nytt ansikt: ${s.flyttet} deltakere byttet plass i sammendraget på én og samme lek.`,
          undertekst: `${s.sum} plasseringer byttet eier`,
          ovelseNavn: o.navn,
          ovelseNr: o.nr,
          resultater,
        },
      });
    }
  }

  // Tetsjiktet: den tetteste klyngen i sammendraget (utenom vinneren) —
  // tre eller fire deltakere skilt av noen fattige poeng.
  {
    const felt = medPoeng.filter((r) => r.userId !== vinnerId);
    let beste: { medlemmer: { userId: string; poeng: number }[]; spenn: number; vekt: number } | null = null;
    for (const stoerrelse of [3, 4]) {
      for (let i = 0; i + stoerrelse <= felt.length; i++) {
        const vindu = felt.slice(i, i + stoerrelse);
        const spenn = vindu[0].totalPoeng - vindu[vindu.length - 1].totalPoeng;
        const vekt = Math.min(80, 66 - spenn * 4 + stoerrelse * 2);
        if (!beste || vekt > beste.vekt) {
          beste = {
            medlemmer: vindu.map((r) => ({ userId: r.userId, poeng: r.totalPoeng })),
            spenn,
            vekt,
          };
        }
      }
    }
    if (beste && beste.vekt > 40) {
      const navneliste = beste.medlemmer
        .map((m) => fornavnAv(m.userId))
        .join(", ")
        .replace(/, ([^,]*)$/, " og $1");
      kandidater.push({
        vekt: beste.vekt,
        visuell: "skala",
        featured: beste.medlemmer.map((m) => m.userId),
        kronNr: null,
        innslag: {
          slag: "tetsjikt",
          tittel: "Tetsjiktet",
          emoji: "🧨",
          tekst:
            beste.spenn === 0
              ? `Helt likt! ${navneliste} står bom fast på samme poengsum i sammendraget.`
              : `Her er det trangt: bare ${beste.spenn} poeng skiller ${navneliste} i sammendraget — alt kan snu neste år!`,
          spenn: beste.spenn,
          medlemmer: beste.medlemmer,
        },
      });
    }
  }

  // Formtoppen / Formsvikt: heteste og kaldeste periode på tre påfølgende
  // leker. For hver deltaker ser vi på hvert vindu av tre leker på rad de
  // faktisk var med i alle tre, og summerer poengene. Toppen kan være hvem som
  // helst (en formtopp røper ikke sammenlagt), men svikten holder vinneren
  // utenfor — det ville vært en underlig hilsen til mesteren.
  if (kronologisk.length >= 3) {
    const FORM_TOPP_MIN = 20; // ~7 i snitt over tre leker = en ekte opptur
    const FORM_SVIKT_MAKS = 9; // ~3 i snitt over tre leker = en ekte bølgedal
    const poengILek = kronologisk.map((o) => {
      const m = new Map<string, number>();
      for (const r of o.resultater) m.set(r.userId, r.poeng);
      return m;
    });
    const vindu = (uid: string, i: number) => {
      const p0 = poengILek[i].get(uid);
      const p1 = poengILek[i + 1].get(uid);
      const p2 = poengILek[i + 2].get(uid);
      if (p0 === undefined || p1 === undefined || p2 === undefined) return null;
      return [p0, p1, p2];
    };

    let topp: { userId: string; sum: number; i: number } | null = null;
    let svikt: { userId: string; sum: number; i: number } | null = null;
    for (const r of medPoeng) {
      for (let i = 0; i + 3 <= kronologisk.length; i++) {
        const ps = vindu(r.userId, i);
        if (!ps) continue;
        const sum = ps[0] + ps[1] + ps[2];
        if (!topp || sum > topp.sum) topp = { userId: r.userId, sum, i };
        if (r.userId !== vinnerId && (!svikt || sum < svikt.sum)) {
          svikt = { userId: r.userId, sum, i };
        }
      }
    }

    const perLekFor = (uid: string, i: number) =>
      [0, 1, 2].map((d) => {
        const o = kronologisk[i + d];
        return { ovelseNr: o.nr, ovelseNavn: o.navn, poeng: poengILek[i + d].get(uid)! };
      });

    if (topp && topp.sum >= FORM_TOPP_MIN) {
      const t = topp;
      const leker = perLekFor(t.userId, t.i);
      kandidater.push({
        vekt: Math.min(80, 40 + t.sum),
        visuell: "form",
        featured: [t.userId],
        kronNr: kronologisk[t.i + 2].nr,
        innslag: {
          slag: "form",
          variant: "topp",
          tittel: "Formtoppen",
          emoji: "🔥",
          tekst: `${fornavnAv(t.userId)} var rødglødende midtveis: ${t.sum} poeng på tre leker på rad («${leker[0].ovelseNavn}», «${leker[1].ovelseNavn}» og «${leker[2].ovelseNavn}») — sesongens heteste periode.`,
          userId: t.userId,
          sum: t.sum,
          perLek: leker,
        },
      });
    }

    if (svikt && svikt.sum <= FORM_SVIKT_MAKS) {
      const s = svikt;
      const leker = perLekFor(s.userId, s.i);
      kandidater.push({
        vekt: Math.min(74, 46 + (FORM_SVIKT_MAKS - s.sum) * 3),
        visuell: "form",
        featured: [s.userId],
        kronNr: kronologisk[s.i + 2].nr,
        innslag: {
          slag: "form",
          variant: "svikt",
          tittel: "Bølgedalen",
          emoji: "🧊",
          tekst: `Alle har en tung uke: ${fornavnAv(s.userId)} fikk bare ${s.sum} poeng på tre leker på rad («${leker[0].ovelseNavn}», «${leker[1].ovelseNavn}» og «${leker[2].ovelseNavn}»). Sesongens kaldeste periode — men det snudde!`,
          userId: s.userId,
          sum: s.sum,
          perLek: leker,
        },
      });
    }
  }

  // Spesialisten: høyest poengsnitt innen én egenskap, blant dem som spilte
  // nok leker i den egenskapen til at snittet betyr noe.
  {
    const SPESIALIST_MIN_LEKER = 3;
    const SPESIALIST_MIN_SNITT = 6; // klart over midten av skalaen
    const perKvalitet = new Map<Kvalitet, Map<string, number[]>>();
    for (const o of kronologisk) {
      for (const k of o.kvaliteter) {
        let um = perKvalitet.get(k);
        if (!um) {
          um = new Map();
          perKvalitet.set(k, um);
        }
        for (const res of o.resultater) {
          const arr = um.get(res.userId) ?? [];
          arr.push(res.poeng);
          um.set(res.userId, arr);
        }
      }
    }
    let best: { userId: string; kvalitet: Kvalitet; snitt: number; antall: number } | null = null;
    for (const [k, um] of perKvalitet) {
      for (const [uid, arr] of um) {
        if (arr.length < SPESIALIST_MIN_LEKER) continue;
        const s = snitt(arr);
        if (!best || s > best.snitt || (s === best.snitt && arr.length > best.antall)) {
          best = { userId: uid, kvalitet: k, snitt: s, antall: arr.length };
        }
      }
    }
    if (best && best.snitt >= SPESIALIST_MIN_SNITT) {
      const b = best;
      const label = kvalitetTekst[b.kvalitet];
      kandidater.push({
        vekt: Math.min(76, 34 + b.snitt * 4),
        visuell: "spesialist",
        featured: [b.userId],
        kronNr: null,
        innslag: {
          slag: "spesialist",
          tittel: "Spesialisten",
          emoji: "🎯",
          tekst: `Ingen mestret ${label.toLowerCase()} som ${fornavnAv(b.userId)}: ${b.snitt.toFixed(1)} poeng i snitt over ${b.antall} leker som testet nettopp det.`,
          userId: b.userId,
          kvalitet: label,
          snitt: b.snitt,
          antall: b.antall,
        },
      });
    }
  }

  // ─── Priser ─────────────────────────────────────────────────────
  const priser: Pris[] = [];

  const flaksFilter = (o: KronOvelse) => o.kvaliteter.includes("FLAKS");
  const harFlaksLeker = kronologisk.some(flaksFilter);
  if (harFlaksLeker) {
    const flaksKandidater = medPoeng
      .map((r) => {
        const ranks = ranksFor(r.userId, flaksFilter);
        return { userId: r.userId, snitt: snitt(ranks), antall: ranks.length };
      })
      .filter((k) => k.antall >= 1);
    if (flaksKandidater.length >= 2) {
      const antallFlaks = kronologisk.filter(flaksFilter).length;
      const lekTekst = (n: number) => `${n} flakslek${n === 1 ? "" : "er"}`;
      const verst = [...flaksKandidater].sort(
        (a, b) => b.snitt - a.snitt || b.antall - a.antall,
      )[0];
      const best = [...flaksKandidater].sort(
        (a, b) => a.snitt - b.snitt || b.antall - a.antall,
      )[0];
      priser.push({
        key: "uflaks",
        navn: "Uflaksprisen",
        emoji: "🎲",
        begrunnelse: `Til den som tapte mest der flaksen rådde — av ${antallFlaks === 1 ? "årets flakslek" : lekTekst(antallFlaks)} gikk ingen deltakerens vei.`,
        userId: verst.userId,
        verdi: `snittplass ${verst.snitt.toFixed(1)} i ${lekTekst(verst.antall)}`,
      });
      if (best.userId !== verst.userId) {
        priser.push({
          key: "lykke",
          navn: "Lykketrollet",
          emoji: "🍀",
          begrunnelse:
            "Til den som alltid lander på beina når terningen bestemmer.",
          userId: best.userId,
          verdi: `snittplass ${best.snitt.toFixed(1)} i ${lekTekst(best.antall)}`,
        });
      }
    }
  }

  const svingKandidater = medPoeng
    .map((r) => {
      const ranks = ranksFor(r.userId);
      return {
        userId: r.userId,
        std: stdAvvik(ranks),
        snitt: snitt(ranks),
        best: ranks.length ? Math.min(...ranks) : 0,
        verst: ranks.length ? Math.max(...ranks) : 0,
        antall: ranks.length,
      };
    })
    .filter((k) => k.antall >= 3);
  if (svingKandidater.length >= 2) {
    const berg = [...svingKandidater].sort((a, b) => b.std - a.std)[0];
    if (berg.std > 0) {
      priser.push({
        key: "berg",
        navn: "Berg-og-dalbanen",
        emoji: "🎢",
        begrunnelse:
          "Til den mest uforutsigbare — himmel eller kjeller, aldri midt på treet.",
        userId: berg.userId,
        verdi: `alt fra ${berg.best}. til ${berg.verst}. plass`,
      });
    }
    const metronom = [...svingKandidater].sort((a, b) => a.std - b.std)[0];
    if (metronom.userId !== berg.userId) {
      priser.push({
        key: "metronom",
        navn: "Metronomen",
        emoji: "📏",
        begrunnelse: "Til den mest stabile — samme nivå uansett lek.",
        userId: metronom.userId,
        verdi: `nesten alltid rundt ${Math.round(metronom.snitt)}. plass`,
      });
    }
  }

  const utenSeier = deltakere
    .filter((d) => d.seire === 0 && d.totalPoeng > 0)
    .sort((a, b) => b.totalPoeng - a.totalPoeng)[0];
  if (utenSeier) {
    priser.push({
      key: "arbeidsjern",
      navn: "Arbeidsjernet",
      emoji: "🔨",
      begrunnelse:
        "Til den som samlet poeng på ren utholdenhet — helt uten drahjelp fra seire.",
      userId: utenSeier.userId,
      verdi: `${utenSeier.totalPoeng} poeng — uten en eneste seier`,
    });
  }

  // Maks fire priser, i foretrukket rekkefølge
  const prisRekkefolge = ["uflaks", "lykke", "berg", "arbeidsjern", "metronom"];
  priser.sort((a, b) => prisRekkefolge.indexOf(a.key) - prisRekkefolge.indexOf(b.key));
  const valgtePriser = priser.slice(0, 4);

  // ─── Utvelgelse med dekningsgaranti ─────────────────────────────
  // Vinneren dekkes av kåringen, prisvinnere av prisutdelingen. Alle andre
  // må inn i et innslag — eller få hederlig omtale.
  const maaDekkes = new Set(medPoeng.map((r) => r.userId));
  if (vinnerId) maaDekkes.delete(vinnerId);
  for (const p of valgtePriser) maaDekkes.delete(p.userId);

  const { valgte, dekket } = velgInnslag(kandidater, maaDekkes);

  const hederlige: Hederlig[] = deltakere
    .filter((d) => maaDekkes.has(d.userId) && !dekket.has(d.userId))
    .map((d) => ({
      userId: d.userId,
      stat:
        d.seire >= 1
          ? `${d.seire} seier${d.seire === 1 ? "" : "e"} 🏆`
          : d.pall >= 1
            ? `${d.pall} pallplass${d.pall === 1 ? "" : "er"} 🥈`
            : d.besteOvelse
              ? `${d.besteOvelse.poeng}p i «${d.besteOvelse.navn}» 🔥`
              : `stilte i ${d.antallOvelser} leker ⚔️`,
    }));

  // ─── Vendepunktet: da vinneren grep ledelsen for godt ───────────
  let vendepunkt: Vendepunkt | null = null;
  if (vinnerId && tidslinje.length >= 2) {
    let sisteStegUtenLedelse = -1;
    tidslinje.forEach((steg, i) => {
      if (steg.lederId !== vinnerId) sisteStegUtenLedelse = i;
    });
    const navn = fornavnAv(vinnerId);
    const vinnerSerie = posisjoner.serier.find((s) => s.userId === vinnerId);
    if (sisteStegUtenLedelse === -1) {
      vendepunkt = {
        tittel: "Start til mål",
        emoji: "🏁",
        tekst: `${navn} tok ledelsen i første lek og slapp den aldri. En ren start-til-mål-seier!`,
        userId: vinnerId,
        ovelseNr: null,
      };
    } else if (sisteStegUtenLedelse === tidslinje.length - 2) {
      const siste = tidslinje[tidslinje.length - 1];
      const plassFoer =
        (vinnerSerie?.ranks[tidslinje.length - 2] ?? null) ?? 2;
      vendepunkt = {
        tittel: "Avgjort på målstreken",
        emoji: "🫀",
        tekst: `Alt sto åpent til siste slutt — men «${siste.ovelseNavn}» løftet ${navn} fra ${plassFoer}. plass og helt til topps!`,
        userId: vinnerId,
        ovelseNr: siste.nr,
      };
    } else {
      const steg = tidslinje[sisteStegUtenLedelse + 1];
      vendepunkt = {
        tittel: "Vendepunktet",
        emoji: "⚡",
        tekst: `Fra «${steg.ovelseNavn}» (lek ${steg.nr} av ${tidslinje.length}) grep ${navn} ledelsen — og ga den aldri tilbake.`,
        userId: vinnerId,
        ovelseNr: steg.nr,
      };
    }
  }

  return {
    sesongNavn: sesong.navn,
    aar: sesong.aar,
    antallFullfort: kronologisk.length,
    antallOvelser,
    deltakere,
    tidslinje,
    personer,
    posisjoner,
    innslag: valgte.map((k) => k.innslag),
    hederlige,
    vendepunkt,
    priser: valgtePriser,
  };
}
