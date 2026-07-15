import { describe, it, expect } from "vitest";
import type { Kvalitet } from "@prisma/client";
import { byggFinaleData, type FinaleOvelseRad, type Innslag } from "@/lib/finale";
import { byggSlides } from "@/lib/finaleSlides";
import type { SesongData } from "@/lib/stilling";

// ─── Deterministisk RNG (mulberry32) ─────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STANDARD = [10, 8, 6, 5, 4, 3, 2, 1];
const KVALITETER: Kvalitet[] = [
  "STYRKE", "UTHOLDENHET", "PRESISJON", "FLAKS", "LAGSPILL",
  "TAKTIKK", "HURTIGHET", "KREATIVITET", "KUNNSKAP", "NERVER",
];

/** Bygger en tilfeldig, men konsistent sesong (individuelle øvelser med
 *  standard poengskjema, roterende vert som ikke deltar). Returnerer alt
 *  byggFinaleData trenger. */
function lagSesong(seed: number) {
  const r = rng(seed);
  const nSpillere = 3 + Math.floor(r() * 8); // 3–10
  const mOvelser = 1 + Math.floor(r() * 12); // 1–12

  const spillere = Array.from({ length: nSpillere }, (_, i) => ({
    id: `u${i}`,
    navn: `Spiller ${i} Etternavn${i}`,
    bildeUrl: null,
    farge: `#${(0x100000 + Math.floor(r() * 0xefffff)).toString(16)}`,
  }));

  const base = new Date("2026-07-01T12:00:00Z").getTime();
  const ovelser: FinaleOvelseRad[] = [];
  // per spiller: liste av deres individuelle resultater
  const perSpiller = new Map<string, SesongData["brukere"][number]["individuelleResultater"]>();
  for (const s of spillere) perSpiller.set(s.id, []);
  const vertPerOvelse: { vertId: string }[] = [];

  for (let j = 0; j < mOvelser; j++) {
    const kvaliteter: Kvalitet[] = [KVALITETER[Math.floor(r() * KVALITETER.length)]];
    if (r() > 0.5) kvaliteter.push(KVALITETER[Math.floor(r() * KVALITETER.length)]);
    const vert = spillere[j % nSpillere];
    const deltakere = spillere.filter((s) => s.id !== vert.id);
    // tilfeldig rangering
    const stokket = [...deltakere].sort(() => r() - 0.5);
    const ovelseId = `o${j}`;
    const indRes = stokket.map((s, rank) => ({
      userId: s.id,
      poeng: STANDARD[rank] ?? 0,
      plassering: rank + 1,
    }));

    ovelser.push({
      id: ovelseId,
      navn: `Øvelse ${j}`,
      kvaliteter,
      fullfortTid: new Date(base + j * 86400000),
      createdAt: new Date(base),
      individuelleResultater: indRes.map(({ userId, poeng }) => ({ userId, poeng })),
      lag: [],
    });
    vertPerOvelse.push({ vertId: vert.id });
    for (const res of indRes) {
      perSpiller.get(res.userId)!.push({
        id: `${ovelseId}-${res.userId}`,
        ovelseId,
        plassering: res.plassering,
        poeng: res.poeng,
        ovelse: { id: ovelseId, kvaliteter },
      });
    }
  }

  const sesongData: SesongData = {
    brukere: spillere.map((s) => ({
      ...s,
      individuelleResultater: perSpiller.get(s.id)!,
      lagmedlemskap: [],
    })),
    vertPerOvelse,
  };

  return { sesongData, ovelser, antallOvelser: mOvelser, nSpillere, mOvelser };
}

/** Hvilke spillere et innslag faktisk løfter fram. */
function innslagSpillere(innslag: Innslag): string[] {
  switch (innslag.slag) {
    case "duell":
      return [innslag.vinner.userId, innslag.taper.userId];
    case "comeback":
    case "fall":
    case "rekord":
    case "ledertroye":
    case "avvik":
      return [innslag.userId];
    case "rival":
    case "tvillinger":
      return [innslag.aId, innslag.bId];
    case "podium":
      return innslag.topp.map((t) => t.userId);
    case "poengfest":
      return innslag.resultater.map((r) => r.userId);
    case "tetsjikt":
      return innslag.medlemmer.map((m) => m.userId);
  }
}

/** Innslag som ville røpet sammenlagtvinneren om de featuret vedkommende. */
function erSpoilerInnslag(innslag: Innslag): boolean {
  if (innslag.slag === "comeback" || innslag.slag === "fall") return true;
  if (innslag.slag === "rival") return true;
  if (innslag.slag === "avvik" && innslag.variant === "sluttspurt") return true;
  return false;
}

describe("finaleshowets invarianter (Monte Carlo over 400 sesonger)", () => {
  const SESONGER = 400;

  it("holder alle harde garantier på tvers av tilfeldige sesonger", () => {
    for (let seed = 1; seed <= SESONGER; seed++) {
      const { sesongData, ovelser, antallOvelser } = lagSesong(seed);
      const data = byggFinaleData({ navn: "Test", aar: 2026 }, sesongData, ovelser, antallOvelser);
      const slides = byggSlides(data);
      // Reelt antall deltakere = de som faktisk fikk poeng (verten i en
      // 1-øvelses sesong sitter over og havner ikke i sammendraget)
      const n = data.deltakere.length;
      const ctx = `seed=${seed} deltakere=${n} øvelser=${antallOvelser}`;

      // 1) ALLTID nøyaktig én vinner-slide, og den peker på sammenlagtleder
      const vinnerSlides = slides.filter((s) => s.type === "vinner");
      expect(vinnerSlides.length, `én vinner-slide (${ctx})`).toBe(1);
      const vinnerSlide = vinnerSlides[0];
      if (vinnerSlide.type === "vinner") {
        expect(vinnerSlide.deltaker.userId, `vinner = leder (${ctx})`).toBe(
          data.deltakere[0].userId,
        );
        expect(vinnerSlide.deltaker.plass, `vinner har 1. plass (${ctx})`).toBe(1);
      }
      // og en trommevirvel rett før
      const iVinner = slides.findIndex((s) => s.type === "vinner");
      expect(slides[iVinner - 1].type, `trommevirvel før vinner (${ctx})`).toBe("trommevirvel");

      // 2) "Noe artig med ≥50 % av spillerne" — hard garanti:
      //    tidslinjen (animert poengrace med ALLE deltakere) er alltid med,
      //    og likeså kortviften. Det dekker kravet uansett datamengde.
      expect(slides.some((s) => s.type === "tidslinje"), `tidslinje finnes (${ctx})`).toBe(true);
      if (n >= 2) {
        expect(slides.some((s) => s.type === "vifte"), `kortvifte finnes (${ctx})`).toBe(true);
      }
      // I tillegg: i en reell sesong (≥3 øvelser) skal det finnes et dedikert
      // bredt HØYDEPUNKT-innslag som favner ≥ halvparten av feltet.
      const dekninger = data.innslag.map((i) => new Set(innslagSpillere(i)).size);
      const maxDekning = Math.max(0, ...dekninger);
      if (antallOvelser >= 3 && n >= 3) {
        expect(maxDekning, `bredt høydepunkt-innslag ≥50 % (${ctx})`).toBeGreaterThanOrEqual(
          Math.ceil(n / 2),
        );
      }

      // 3) Full dekning: hver deltaker er vinner, prisvinner, i et innslag,
      //    eller får hederlig omtale — ingen blir usynlig
      const dekket = new Set<string>();
      dekket.add(data.deltakere[0].userId);
      for (const p of data.priser) dekket.add(p.userId);
      for (const h of data.hederlige) dekket.add(h.userId);
      for (const i of data.innslag) for (const u of innslagSpillere(i)) dekket.add(u);
      for (const d of data.deltakere) {
        expect(dekket.has(d.userId), `${d.fornavn} er dekket (${ctx})`).toBe(true);
      }

      // 4) Variasjon: ingen visualisering gjentas — unntatt duellen, som er
      //    kappet på 2. Det garanterer at måten data presenteres på veksler.
      const antallPerType = new Map<string, number>();
      for (const i of data.innslag) antallPerType.set(i.slag, (antallPerType.get(i.slag) ?? 0) + 1);
      for (const [slag, antall] of antallPerType) {
        const tak = slag === "duell" ? 2 : 1;
        expect(antall, `${slag} gjentas maks ${tak} (${ctx})`).toBeLessThanOrEqual(tak);
      }
      // ingen tre påfølgende innslag av samme visualiseringstype
      const innslagSekvens = slides
        .filter((s) => s.type === "innslag")
        .map((s) => (s.type === "innslag" ? s.innslag.slag : ""));
      for (let i = 2; i < innslagSekvens.length; i++) {
        const treLike =
          innslagSekvens[i] === innslagSekvens[i - 1] &&
          innslagSekvens[i] === innslagSekvens[i - 2];
        expect(treLike, `ikke tre like innslag på rad (${ctx})`).toBe(false);
      }

      // 5) Spoiler-vern: vinneren dukker ALDRI opp i comeback/fall/rival/sluttspurt
      for (const i of data.innslag) {
        if (erSpoilerInnslag(i)) {
          expect(
            innslagSpillere(i).includes(data.deltakere[0].userId),
            `vinner ikke røpet i ${i.slag} (${ctx})`,
          ).toBe(false);
        }
      }

      // 6) Showet har alltid en fornuftig lengde (intro + vifte + … + tallene)
      expect(slides[0].type, `starter på intro (${ctx})`).toBe("intro");
      expect(slides[slides.length - 1].type, `ender på tallene (${ctx})`).toBe("tallene");
    }
  });
});
