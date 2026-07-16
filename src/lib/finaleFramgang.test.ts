import { describe, it, expect } from "vitest";
import type { Kvalitet } from "@prisma/client";
import { byggFinaleData, type FinaleOvelseRad } from "@/lib/finale";
import { byggFramgang } from "@/lib/finaleSlides";
import type { SesongData } from "@/lib/stilling";

const KVAL: Kvalitet[] = ["PRESISJON"];
const base = new Date("2026-07-01T12:00:00Z").getTime();

type Spiller = { id: string; navn: string };
type Lek = { vertId: string; poeng: Record<string, number> };

/** Bygger en minimal, deterministisk sesong for byggFinaleData. */
function byggSesong(spillere: Spiller[], leker: Lek[]) {
  const ovelser: FinaleOvelseRad[] = leker.map((lek, j) => ({
    id: `o${j}`,
    navn: `Lek ${j}`,
    kvaliteter: KVAL,
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
                ovelse: { id: o.id, kvaliteter: KVAL },
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

  it("lager verken storseier eller fotofinish av vanlige 2-poengsluker", () => {
    const leker: Lek[] = [
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { a: 10, b: 8, c: 6 } },
      { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
    ];
    const varianter = byggSesong(spillere, leker)
      .innslag.filter((i) => i.slag === "duell")
      .map((i) => (i.slag === "duell" ? i.variant : ""));
    expect(varianter).not.toContain("storseier");
    expect(varianter).not.toContain("thriller");
  });

  it("kårer en storseier når bonuspoeng gir et reelt forsprang", () => {
    const leker: Lek[] = [
      { vertId: "v", poeng: { a: 15, b: 8, c: 6 } }, // +5 bonus → margin 7
      { vertId: "v", poeng: { b: 10, a: 8, c: 6 } },
      { vertId: "v", poeng: { c: 10, b: 8, a: 6 } },
    ];
    const dueller = byggSesong(spillere, leker).innslag.filter((i) => i.slag === "duell");
    expect(dueller.some((i) => i.slag === "duell" && i.variant === "storseier")).toBe(true);
  });
});
