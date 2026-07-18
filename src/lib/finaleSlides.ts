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
  | { key: string; type: "uavgjort"; vinnere: FinaleDeltaker[] }
  | { key: string; type: "vinner"; vinnere: FinaleDeltaker[] }
  | { key: string; type: "framgang"; framgang: FramgangPost[] }
  | { key: string; type: "tallene" };

export function byggSlides(data: FinaleData): Slide[] {
  const slides: Slide[] = [{ key: "intro", type: "intro" }];

  // Et lite tilbakeblikk til forrige utgave før vi går inn i årets show —
  // fjorårets pall og et par tall, som en «tidligere i lekene»-vignett.
  slides.push({ key: "ifjor", type: "ifjor" });

  // Årets felt: alle deltakerne som kortvifte, à la karaktervalget i
  // Mario Party — før historien begynner
  if (data.deltakere.length >= 2) {
    slides.push({ key: "vifte", type: "vifte" });
  }

  // Innslagene flyter rett inn — ingen egne kapittelkort; overgangene er
  // tydelige nok i seg selv.
  data.innslag.forEach((innslag, i) => {
    slides.push({ key: `innslag-${innslag.slag}-${i}`, type: "innslag", innslag });
  });

  for (const p of data.priser) {
    slides.push({ key: `pris-${p.key}`, type: "pris", pris: p });
  }
  if (data.hederlige.length > 0) {
    slides.push({ key: "hederlig", type: "hederlig" });
  }

  // Merk: vendepunktet er bevisst utelatt fra selve showet — det navngir
  // vinneren rett før kåringen og røper dermed slutten. Dataene finnes fortsatt
  // (data.vendepunkt) til en framtidig «lek deg i statistikken»-side.
  if (data.tidslinje.length > 0) {
    slides.push({ key: "tidslinje", type: "tidslinje" });
  }
  // Alle med plass 1 er vinnere — ved poenglikhet på toppen deles tronen
  const vinnere = data.deltakere.filter((d) => d.plass === 1);
  if (vinnere.length > 0) {
    slides.push({ key: "trommevirvel", type: "trommevirvel" });
    // Delt seier: showet tar en humoristisk sving innom dommerbordet
    // («VENT LITT … det står HELT likt!») før BEGGE mesterne avsløres.
    if (vinnere.length >= 2) {
      slides.push({ key: "uavgjort", type: "uavgjort", vinnere });
    }
    slides.push({ key: "vinner", type: "vinner", vinnere });
    // Etter kåringen (ingen spoiler-fare): hvem løftet seg fra i fjor?
    const framgang = byggFramgang(data);
    if (framgang.length > 0) {
      slides.push({ key: "framgang", type: "framgang", framgang });
    }
    slides.push({ key: "tallene", type: "tallene" });
  }
  return slides;
}

// ─── Funn: automatisk gravde godbiter til «Tallenes tale» ────────

/** Et lite, artig funn — én tallverdi med kontekst, til funn-kortene */
export type Funn = {
  emoji: string;
  verdi: string;
  label: string;
  detalj?: string;
};

/** Graver fram en bunke småfunn fra sesongdataene — ren funksjon, så
 *  utvalget kan testes. Rekkefølgen er fast; kort uten datagrunnlag
 *  utelates i stedet for å vises tomme. */
export function byggFunn(data: FinaleData): Funn[] {
  const funn: Funn[] = [];
  const navnAv = (id: string) => data.personer[id]?.fornavn ?? "?";
  const leker = data.leker ?? [];
  const tl = data.tidslinje;

  // Ledertrøyas vandring
  if (tl.length >= 2) {
    const bytter = tl.filter((s, i) => i > 0 && s.lederbytte).length;
    const etapper = new Map<string, number>();
    for (const s of tl) {
      if (s.lederId) etapper.set(s.lederId, (etapper.get(s.lederId) ?? 0) + 1);
    }
    const topp = [...etapper.entries()].sort((a, b) => b[1] - a[1])[0];
    funn.push({
      emoji: "👑",
      verdi: String(bytter),
      label: bytter === 1 ? "lederbytte underveis" : "lederbytter underveis",
      detalj: topp
        ? `${navnAv(topp[0])} ledet lengst — ${topp[1]} av ${tl.length} etapper`
        : undefined,
    });
  }

  // Hvor mange ulike vant leker?
  if (leker.length > 0) {
    const lekvinnere = new Set<string>();
    for (const l of leker) {
      for (const r of l.resultater) if (r.plass === 1) lekvinnere.add(r.userId);
    }
    funn.push({
      emoji: "🥇",
      verdi: String(lekvinnere.size),
      label:
        lekvinnere.size === 1
          ? "deltaker vant alle lekene"
          : "ulike deltakere vant leker",
      detalj: `fordelt på ${leker.length} leker`,
    });
  }

  // Lengste seiersrekke (leker man satt over bryter ikke rekka)
  {
    let beste: { userId: string; lengde: number } | null = null;
    for (const d of data.deltakere) {
      let run = 0;
      for (const l of leker) {
        const res = l.resultater.find((r) => r.userId === d.userId);
        if (!res) continue;
        run = res.plass === 1 ? run + 1 : 0;
        if (run > (beste?.lengde ?? 0)) beste = { userId: d.userId, lengde: run };
      }
    }
    if (beste && beste.lengde >= 2) {
      funn.push({
        emoji: "🔥",
        verdi: `${beste.lengde} strake`,
        label: "lengste seiersrekke",
        detalj: navnAv(beste.userId),
      });
    }
  }

  // Største byks i sammendraget på én lek
  {
    let byks: { userId: string; opp: number; steg: number } | null = null;
    for (const serie of data.posisjoner.serier) {
      for (let i = 1; i < serie.ranks.length; i++) {
        const foer = serie.ranks[i - 1];
        const naa = serie.ranks[i];
        if (foer === null || naa === null) continue;
        const opp = foer - naa;
        if (opp > (byks?.opp ?? 0)) byks = { userId: serie.userId, opp, steg: i };
      }
    }
    if (byks && byks.opp >= 2) {
      funn.push({
        emoji: "🚀",
        verdi: `${byks.opp} plasser`,
        label: "største byks på én lek",
        detalj: `${navnAv(byks.userId)} etter «${tl[byks.steg]?.ovelseNavn ?? "?"}»`,
      });
    }
  }

  // Dødt løp-leker (delt lekseier)
  {
    const delte = leker.filter(
      (l) => l.resultater.filter((r) => r.plass === 1).length >= 2,
    ).length;
    if (delte > 0) {
      funn.push({
        emoji: "🤝",
        verdi: String(delte),
        label: delte === 1 ? "lek endte i dødt løp" : "leker endte i dødt løp",
      });
    }
  }

  // Tettest på toppen i andre halvdel av sesongen
  if (tl.length >= 2) {
    let minst: { gap: number; navn: string } | null = null;
    for (const s of tl.slice(Math.floor(tl.length / 2))) {
      if (s.stilling.length < 2) continue;
      const gap = s.stilling[0].poeng - s.stilling[1].poeng;
      if (!minst || gap < minst.gap) minst = { gap, navn: s.ovelseNavn };
    }
    if (minst) {
      funn.push({
        emoji: "😱",
        verdi: `${minst.gap} poeng`,
        label: "minste luke på toppen i innspurten",
        detalj: `etter «${minst.navn}»`,
      });
    }
  }

  // Villeste reise: størst spenn mellom beste og verste sammenlagtplass
  {
    let vill: { userId: string; best: number; verst: number } | null = null;
    for (const serie of data.posisjoner.serier) {
      const ranks = serie.ranks.filter((r): r is number => r !== null);
      if (ranks.length < 2) continue;
      const best = Math.min(...ranks);
      const verst = Math.max(...ranks);
      if (!vill || verst - best > vill.verst - vill.best) {
        vill = { userId: serie.userId, best, verst };
      }
    }
    if (vill && vill.verst - vill.best >= 2) {
      funn.push({
        emoji: "🎢",
        verdi: `${vill.verst - vill.best} plasser`,
        label: "villeste reise i tabellen",
        detalj: `${navnAv(vill.userId)} — innom både ${vill.best}. og ${vill.verst}. plass`,
      });
    }
  }

  // Flest innbyrdes møter + fasit
  if (leker.length > 0 && data.deltakere.length >= 2) {
    type Par = { aId: string; bId: string; moter: number; aSeire: number; bSeire: number };
    let beste: Par | null = null;
    for (let i = 0; i < data.deltakere.length; i++) {
      for (let j = i + 1; j < data.deltakere.length; j++) {
        const aId = data.deltakere[i].userId;
        const bId = data.deltakere[j].userId;
        let moter = 0;
        let aSeire = 0;
        let bSeire = 0;
        for (const l of leker) {
          const ra = l.resultater.find((r) => r.userId === aId);
          const rb = l.resultater.find((r) => r.userId === bId);
          if (!ra || !rb) continue;
          moter++;
          if (ra.poeng > rb.poeng) aSeire++;
          else if (rb.poeng > ra.poeng) bSeire++;
        }
        // Flest møter; ved likhet det jevneste oppgjøret
        if (
          moter > 0 &&
          (!beste ||
            moter > beste.moter ||
            (moter === beste.moter &&
              Math.abs(aSeire - bSeire) < Math.abs(beste.aSeire - beste.bSeire)))
        ) {
          beste = { aId, bId, moter, aSeire, bSeire };
        }
      }
    }
    if (beste && beste.moter >= 3) {
      funn.push({
        emoji: "⚔️",
        verdi: `${beste.aSeire}–${beste.bSeire}`,
        label: "flest innbyrdes møter",
        detalj: `${navnAv(beste.aId)} mot ${navnAv(beste.bId)} over ${beste.moter} leker`,
      });
    }
  }

  // Største enkeltfangst — bare interessant hvis over skjemamaks (bonus!)
  {
    let fangst: { userId: string; poeng: number; navn: string } | null = null;
    for (const l of leker) {
      for (const r of l.resultater) {
        if (!fangst || r.poeng > fangst.poeng) {
          fangst = { userId: r.userId, poeng: r.poeng, navn: l.navn };
        }
      }
    }
    if (fangst && fangst.poeng > 10) {
      funn.push({
        emoji: "💎",
        verdi: `${fangst.poeng} poeng`,
        label: "største enkeltfangst (bonus!)",
        detalj: `${navnAv(fangst.userId)} i «${fangst.navn}»`,
      });
    }
  }

  // Mest testede egenskap
  {
    const perKval = new Map<string, number>();
    for (const l of leker) {
      for (const k of l.kvaliteter) perKval.set(k, (perKval.get(k) ?? 0) + 1);
    }
    const topp = [...perKval.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topp && topp[1] >= 2) {
      funn.push({
        emoji: "🧬",
        verdi: topp[0],
        label: "mest testede egenskap",
        detalj: `${topp[1]} leker`,
      });
    }
  }

  // Hele pottens størrelse
  if (leker.length > 0) {
    const total = leker.reduce(
      (sum, l) => sum + l.resultater.reduce((a, r) => a + r.poeng, 0),
      0,
    );
    funn.push({
      emoji: "💰",
      verdi: String(total),
      label: "poeng delt ut i alt",
      detalj: `over ${leker.length} leker`,
    });
  }

  return funn;
}
