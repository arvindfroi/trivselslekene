import { describe, it, expect } from "vitest";
import type { Kvalitet } from "@prisma/client";
import { byggFinaleData, type FinaleOvelseRad } from "@/lib/finale";
import { byggFramgang } from "@/lib/finaleSlides";
import type { SesongData } from "@/lib/stilling";

const KVAL: Kvalitet[] = ["PRESISJON"];
const base = new Date("2026-07-01T12:00:00Z").getTime();

type Spiller = { id: string; navn: string };
type Lek = { vertId: string; poeng: Record<string, number>; kvaliteter?: Kvalitet[] };

/** Bygger en minimal, deterministisk sesong for byggFinaleData. */
function byggSesong(spillere: Spiller[], leker: Lek[]) {
  const ovelser: FinaleOvelseRad[] = leker.map((lek, j) => ({
    id: `o${j}`,
    navn: `Lek ${j}`,
    kvaliteter: lek.kvaliteter ?? KVAL,
    vertId: lek.vertId,
    fullfortTid: new Date(base + j * 86400000),
    createdAt: new Date(base),
    individuelleResultater: Object.entries(lek.poeng).map(([userId, poeng]) => ({
      userId,
      poeng,
    })),
    lag: [],
  }));

  const sesongData: SesongData = {
    brukere: spillere.map((s) => ({
      id: s.id,
      navn: s.navn,
      bildeUrl: null,
      farge: "#334455",
      individuelleResultater: ovelser
        .map((o) => {
          const r = o.individuelleResultater.find((x) => x.userId === s.id);
          return r
            ? {
                id: `${o.id}-${s.id}`,
                ovelseId: o.id,
                plassering: null,
                poeng: r.poeng,
                ovelse: { id: o.id, kvaliteter: o.kvaliteter },
              }
            : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
      lagmedlemskap: [],
    })),
    vertPerOvelse: leker.map((l) => ({ vertId: l.vertId })),
  };

  return byggFinaleData({ navn: "Test 2026", aar: 2026 }, sesongData, ovelser, ovelser.length);
}

describe("byggFramgang (bedre enn i fjor)", () => {
  it("tar med returnerende spillere som løftet snittet, og bare dem", () => {
    // Morten hadde 3,75 i snitt i fjor → 10 i år er klar framgang.
    // Eivind hadde 6,875 i fjor → 6 i år er tilbakegang, ikke med.
    // Cato finnes ikke i fjor → ingen sammenligning.
    const spillere = [
      { id: "m", navn: "Morten Testesen" },
      { id: "e", navn: "Eivind Testesen" },
      { id: "c", navn: "Cato Testesen" },
      { id: "v", navn: "Vakt Mester" },
    ];
    const leker: Lek[] = [
      { vertId: "v", poeng: { m: 10, c: 8, e: 6 } },
      { vertId: "v", poeng: { m: 10, c: 8, e: 6 } },
    ];
    const data = byggSesong(spillere, leker);
    const navn = byggFramgang(data).map((f) => f.fornavn);

    expect(navn).toContain("Morten");
    expect(navn).not.toContain("Eivind");
    expect(navn).not.toContain("Cato");
    expect(navn).not.toContain("Vakt");
  });

  it("gir tom liste når ingen fornavn matcher fjorårets deltakere", () => {
    const spillere = [
      { id: "x", navn: "Xander Ny" },
      { id: "y", navn: "Yngve Ny" },
      { id: "v", navn: "Vakt Mester" },
    ];
    const leker: Lek[] = [{ vertId: "v", poeng: { x: 10, y: 8 } }];
    expect(byggFramgang(byggSesong(spillere, leker))).toHaveLength(0);
  });
});

describe("duell-innslag med fast poengskjema", () => {
  const spillere = [
    { id: "a", navn: "Aa Aa" },
    { id: "b", navn: "Bb Bb" },
    { id: "c", navn: "Cc Cc" },
    { id: "v", navn: "Vv Vv" },
  ];

  it("lager verken fotofinish eller maktperiode av vanlige 2-poengsluker", () => {
    // Standardskjemaets luker (2p i én lek, ≤10p over tre) er ikke historier
    const leker: Lek[] = [
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
    ];
    const varianter = byggSesong(spillere, leker)
      .innslag.filter((i) => i.slag === "duell")
      .map((i) => (i.slag === "duell" ? i.variant : ""));
    expect(varianter).not.toContain("thriller");
    expect(varianter).not.toContain("periode");
  });

  it("kårer fotofinish kun ved ekte dødt løp i en lek", () => {
    const leker: Lek[] = [
      { vertId: "v", poeng: { a: 10, b: 10, c: 6 } }, // delt lekseier
      { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
      { vertId: "v", poeng: { c: 10, b: 8, a: 6 } },
    ];
    const thriller = byggSesong(spillere, leker).innslag.find(
      (i) => i.slag === "duell" && i.variant === "thriller",
    );
    expect(thriller).toBeDefined();
    if (thriller && thriller.slag === "duell") {
      expect(thriller.vinner.poeng).toBe(thriller.taper.poeng);
    }
  });

  it("kårer en maktperiode ved dominans summert over tre leker", () => {
    // a mot c over tre leker: 30 mot 18 = 12 poeng — en ekte periodehistorie
    const leker: Lek[] = [
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
    ];
    const periode = byggSesong(spillere, leker).innslag.find(
      (i) => i.slag === "duell" && i.variant === "periode",
    );
    expect(periode).toBeDefined();
    if (periode && periode.slag === "duell") {
      expect(periode.vinner.poeng - periode.taper.poeng).toBeGreaterThanOrEqual(12);
      expect(periode.leker).toHaveLength(3);
    }
  });

  it("kårer en seiersrekke ved strake lekseire", () => {
    const leker: Lek[] = [
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
    ];
    const rekke = byggSesong(spillere, leker).innslag.find((i) => i.slag === "rekke");
    expect(rekke).toBeDefined();
    if (rekke && rekke.slag === "rekke") {
      expect(rekke.userId).toBe("a");
      expect(rekke.lengde).toBe(2);
    }
  });
});

describe("nye innslag: formtopp, bølgedal og spesialist", () => {
  const spillere = [
    { id: "a", navn: "Aa Aa" },
    { id: "b", navn: "Bb Bb" },
    { id: "c", navn: "Cc Cc" },
    { id: "d", navn: "Dd Dd" },
    { id: "v", navn: "Vv Vv" },
  ];
  const flatt = (dPoeng: number): Lek[] =>
    Array.from({ length: 4 }, () => ({
      vertId: "v",
      poeng: { a: 10, b: 8, c: 6, d: dPoeng },
    }));

  it("kårer en formtopp for en het tre-leks periode", () => {
    const innslag = byggSesong(spillere, flatt(5)).innslag;
    expect(innslag.some((i) => i.slag === "form" && i.variant === "topp")).toBe(true);
  });

  it("kårer en bølgedal for en som underpresterte — aldri for vinneren", () => {
    // «d» leverer topp i de tre første lekene, men kollapser i de tre siste.
    // Snittet blir høyt, så den kalde perioden er en ekte statistisk bølgedal.
    const leker: Lek[] = [
      { vertId: "v", poeng: { d: 10, a: 8, b: 6, c: 5 } },
      { vertId: "v", poeng: { d: 10, a: 8, b: 6, c: 5 } },
      { vertId: "v", poeng: { d: 10, a: 8, b: 6, c: 5 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6, d: 1 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6, d: 1 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6, d: 1 } },
    ];
    const data = byggSesong(spillere, leker);
    const svikt = data.innslag.find((i) => i.slag === "form" && i.variant === "svikt");
    expect(svikt).toBeDefined();
    if (svikt && svikt.slag === "form") {
      expect(svikt.userId).toBe("d");
      expect(svikt.userId).not.toBe(data.deltakere[0].userId);
      // Forventet (ut fra snittet) skal ligge klart over det faktiske
      expect(svikt.forventet).not.toBeNull();
      expect(svikt.forventet!).toBeGreaterThan(svikt.sum);
    }
  });

  it("gir ingen bølgedal for en jevnt svak spiller (ingen underprestering)", () => {
    // «d» ligger stabilt lavt — da er en lav periode bare normalen, ikke en
    // bølgedal, og innslaget skal ikke fyre.
    const data = byggSesong(spillere, flatt(1));
    expect(data.innslag.some((i) => i.slag === "form" && i.variant === "svikt")).toBe(false);
  });

  it("kårer en spesialist med høyt snitt og nok leker i egenskapen", () => {
    const spes = byggSesong(spillere, flatt(5)).innslag.find((i) => i.slag === "spesialist");
    expect(spes).toBeDefined();
    if (spes && spes.slag === "spesialist") {
      expect(spes.userId).toBe("a");
      expect(spes.snitt).toBeGreaterThanOrEqual(6);
      expect(spes.antall).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("poengfest krever ekte bonuspott", () => {
  const spillere = [
    { id: "a", navn: "Aa Aa" },
    { id: "b", navn: "Bb Bb" },
    { id: "c", navn: "Cc Cc" },
    { id: "v", navn: "Vv Vv" },
  ];
  const erPoengfest = (leker: Lek[]) =>
    byggSesong(spillere, leker).innslag.some(
      (i) => i.slag === "poengfest" && i.variant === "poengfest",
    );

  it("fyrer ikke uten bonus", () => {
    expect(
      erPoengfest([
        { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
        { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
        { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
      ]),
    ).toBe(false);
  });

  it("fyrer når bonuspoeng blåser opp potten", () => {
    expect(
      erPoengfest([
        { vertId: "v", poeng: { a: 15, b: 8, c: 6 } }, // +5 over standardpott
        { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
        { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
      ]),
    ).toBe(true);
  });
});

describe("flakspriser krever minst to flaksleker", () => {
  const spillere = [
    { id: "a", navn: "Aa Aa" },
    { id: "b", navn: "Bb Bb" },
    { id: "c", navn: "Cc Cc" },
    { id: "v", navn: "Vv Vv" },
  ];
  const flaks: Kvalitet[] = ["FLAKS"];
  const harUflaks = (leker: Lek[]) =>
    byggSesong(spillere, leker).priser.some((p) => p.key === "uflaks");

  it("gir ingen flakspris med bare én flakslek", () => {
    expect(
      harUflaks([
        { vertId: "v", poeng: { a: 10, b: 8, c: 6 }, kvaliteter: flaks },
        { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
        { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
      ]),
    ).toBe(false);
  });

  it("gir flakspris med to flaksleker", () => {
    expect(
      harUflaks([
        { vertId: "v", poeng: { a: 10, b: 8, c: 6 }, kvaliteter: flaks },
        { vertId: "v", poeng: { a: 10, b: 8, c: 6 }, kvaliteter: flaks },
        { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
      ]),
    ).toBe(true);
  });
});
