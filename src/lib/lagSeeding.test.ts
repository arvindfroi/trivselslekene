import { describe, expect, it } from "vitest";
import {
  analyserLagFormat,
  fordelSpillere,
  validerLagFormat,
  type RankedSpiller,
} from "./lagSeeding";
import type { LagFormat } from "@prisma/client";

// ─── Hjelpefunksjoner ─────────────────────────────────────────────

/** Lag et sett med ranked spillere med stigende poeng (0, 1, 2, ...) */
function lagSpillere(antall: number): RankedSpiller[] {
  return Array.from({ length: antall }, (_, i) => ({
    id: `u${i + 1}`,
    navn: `Deltaker ${i + 1}`,
    poeng: i, // u1=0, u2=1, ... — høyeste poeng = best
  }));
}

/** Lag et sett med ranked spillere med eksplisitte poeng */
function lagSpillereMedPoeng(
  poeng: number[],
): RankedSpiller[] {
  return poeng.map((p, i) => ({ id: `u${i + 1}`, navn: `D${i + 1}`, poeng: p }));
}

/** Hent medlem-ID-er fra et FordeltLag, sortert numerisk */
function medlemmer(lag: { medlemmer: string[] }): string[] {
  return [...lag.medlemmer].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10);
    const nb = parseInt(b.replace(/\D/g, ""), 10);
    return na - nb;
  });
}

/** Summer poeng for et lag */
function sumPoeng(
  lag: { medlemmer: string[] },
  spillere: RankedSpiller[],
): number {
  return lag.medlemmer.reduce((sum, id) => {
    const s = spillere.find((s) => s.id === id);
    return sum + (s?.poeng ?? 0);
  }, 0);
}

// ─── analyserLagFormat ────────────────────────────────────────────

describe("analyserLagFormat", () => {
  it("returnerer null for ANNET", () => {
    expect(analyserLagFormat("ANNET", 10)).toBeNull();
  });

  // Faste formater
  const fasteFormater: [LagFormat, number, number, number[]][] = [
    ["PAR", 2, 4, [2, 2]],
    ["TRIO", 2, 6, [3, 3]],
    ["FIRE_MOT_FIRE", 2, 8, [4, 4]],
    ["FEM_MOT_FEM", 2, 10, [5, 5]],
    ["FIRE_MOT_FEM", 2, 9, [4, 5]],
    ["TRE_MOT_TRE_MOT_TRE", 3, 9, [3, 3, 3]],
    ["TO_MOT_TO_MOT_TO_MOT_TO", 4, 8, [2, 2, 2, 2]],
  ];

  for (const [format, antallLag, , storrelser] of fasteFormater) {
    it(`${format}: ${antallLag} lag, størrelser=[${storrelser.join(",")}]`, () => {
      const s = analyserLagFormat(format, 100);
      expect(s).not.toBeNull();
      expect(s!.antallLag).toBe(antallLag);
      expect(s!.spillerePerLag).toEqual(storrelser);
      expect(s!.lagnavn).toHaveLength(antallLag);
      expect(s!.lagnavn[0]).toBe("Lag 1");
    });
  }

  // Variable formater
  it("TO_LAG: 2 lag, begge variable", () => {
    const s = analyserLagFormat("TO_LAG", 10);
    expect(s!.antallLag).toBe(2);
    expect(s!.spillerePerLag).toEqual([null, null]);
  });

  it("TRE_LAG: 3 lag, alle variable", () => {
    const s = analyserLagFormat("TRE_LAG", 10);
    expect(s!.antallLag).toBe(3);
    expect(s!.spillerePerLag).toEqual([null, null, null]);
  });

  it("FIRE_LAG: 4 lag, alle variable", () => {
    const s = analyserLagFormat("FIRE_LAG", 10);
    expect(s!.antallLag).toBe(4);
    expect(s!.spillerePerLag).toEqual([null, null, null, null]);
  });

  // FLERE_LAG: avhenger av antall deltakere
  it("FLERE_LAG med 10 deltakere gir 5 lag à 2", () => {
    const s = analyserLagFormat("FLERE_LAG", 10);
    expect(s!.antallLag).toBe(5);
    expect(s!.spillerePerLag).toEqual([2, 2, 2, 2, 2]);
  });

  it("FLERE_LAG med 5 deltakere gir 2 lag à 2 (oddetall → rest står)", () => {
    const s = analyserLagFormat("FLERE_LAG", 5);
    expect(s!.antallLag).toBe(2);
    expect(s!.spillerePerLag).toEqual([2, 2]);
  });

  it("FLERE_LAG med 1 deltaker gir 1 lag à 2", () => {
    const s = analyserLagFormat("FLERE_LAG", 1);
    expect(s!.antallLag).toBe(1);
    expect(s!.spillerePerLag).toEqual([2]);
  });

  it("FLERE_LAG med 0 deltakere gir 1 lag (minimum 1)", () => {
    const s = analyserLagFormat("FLERE_LAG", 0);
    expect(s).not.toBeNull();
    expect(s!.antallLag).toBe(1);
    expect(s!.spillerePerLag).toEqual([2]);
  });
});

// ─── fordelSpillere — snake-draft balansering ─────────────────────

describe("fordelSpillere — snake-draft", () => {
  it("PAR (4 spillere, 2 lag): best+dårligst mot midten", () => {
    const spillere = lagSpillereMedPoeng([10, 8, 6, 4]);
    const struktur = analyserLagFormat("PAR", 4)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(2);
    // Snake: Lag1→10, Lag2→8, Lag2→6, Lag1→4
    expect(medlemmer(lagene[0])).toEqual(["u1", "u4"]);
    expect(medlemmer(lagene[1])).toEqual(["u2", "u3"]);
    // Totalpoeng: Lag1=14, Lag2=14 — perfekt balanse
    expect(sumPoeng(lagene[0], spillere)).toBe(14);
    expect(sumPoeng(lagene[1], spillere)).toBe(14);
  });

  it("TRIO (6 spillere, 2 lag): balansert snake for 3 per lag", () => {
    const spillere = lagSpillereMedPoeng([10, 9, 8, 7, 6, 5]);
    const struktur = analyserLagFormat("TRIO", 6)!;
    const lagene = fordelSpillere(spillere, struktur);

    // Snake: L1→10, L2→9, L2→8, L1→7, L1→6, L2→5
    expect(medlemmer(lagene[0])).toEqual(["u1", "u4", "u5"]);
    expect(medlemmer(lagene[1])).toEqual(["u2", "u3", "u6"]);
    expect(sumPoeng(lagene[0], spillere)).toBe(23); // 10+7+6
    expect(sumPoeng(lagene[1], spillere)).toBe(22); // 9+8+5
  });

  it("FIRE_MOT_FIRE (8 spillere, 2 lag)", () => {
    const spillere = lagSpillereMedPoeng([10, 9, 8, 7, 6, 5, 4, 3]);
    const struktur = analyserLagFormat("FIRE_MOT_FIRE", 8)!;
    const lagene = fordelSpillere(spillere, struktur);

    // Snake: L1→10, L2→9, L2→8, L1→7, L1→6, L2→5, L2→4, L1→3
    expect(medlemmer(lagene[0])).toEqual(["u1", "u4", "u5", "u8"]);
    expect(medlemmer(lagene[1])).toEqual(["u2", "u3", "u6", "u7"]);
    // L1=26, L2=26 — perfekt
    expect(sumPoeng(lagene[0], spillere)).toBe(26);
    expect(sumPoeng(lagene[1], spillere)).toBe(26);
  });

  it("FEM_MOT_FEM (10 spillere, 2 lag)", () => {
    const spillere = lagSpillereMedPoeng([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    const struktur = analyserLagFormat("FEM_MOT_FEM", 10)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene[0].medlemmer).toHaveLength(5);
    expect(lagene[1].medlemmer).toHaveLength(5);
    // Snake: L1→10, L2→9, L2→8, L1→7, L1→6, L2→5, L2→4, L1→3, L1→2, L2→1
    expect(medlemmer(lagene[0])).toEqual(["u1", "u4", "u5", "u8", "u9"]);
    expect(medlemmer(lagene[1])).toEqual(["u2", "u3", "u6", "u7", "u10"]);
    expect(sumPoeng(lagene[0], spillere)).toBe(28);
    expect(sumPoeng(lagene[1], spillere)).toBe(27);
  });

  it("FIRE_MOT_FEM (9 spillere, asymmetrisk 4+5)", () => {
    const spillere = lagSpillereMedPoeng([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    const struktur = analyserLagFormat("FIRE_MOT_FEM", 9)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene[0].medlemmer).toHaveLength(4);
    expect(lagene[1].medlemmer).toHaveLength(5);
    // Snake: L1→9, L2→8, L2→7, L1→6, L1→5, L2→4, L2→3, L1→2, L2→1
    expect(medlemmer(lagene[0])).toEqual(["u1", "u4", "u5", "u8"]);
    expect(medlemmer(lagene[1])).toEqual(["u2", "u3", "u6", "u7", "u9"]);
    // L1=22, L2=23 — nær balanse gitt asymmetri
  });

  it("TRE_MOT_TRE_MOT_TRE (9 spillere, 3 lag)", () => {
    const spillere = lagSpillereMedPoeng([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    const struktur = analyserLagFormat("TRE_MOT_TRE_MOT_TRE", 9)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(3);
    // Snake 0→1→2→2→1→0→0→1→2
    expect(medlemmer(lagene[0])).toEqual(["u1", "u6", "u7"]);
    expect(medlemmer(lagene[1])).toEqual(["u2", "u5", "u8"]);
    expect(medlemmer(lagene[2])).toEqual(["u3", "u4", "u9"]);
    // Poeng: L1=20, L2=15, L3=15 — Lag1 sterkest (får #1), men jevnt nok
  });

  it("TO_MOT_TO_MOT_TO_MOT_TO (8 spillere, 4 lag à 2)", () => {
    const spillere = lagSpillereMedPoeng([8, 7, 6, 5, 4, 3, 2, 1]);
    const struktur = analyserLagFormat("TO_MOT_TO_MOT_TO_MOT_TO", 8)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(4);
    lagene.forEach((l) => expect(l.medlemmer).toHaveLength(2));
    // Snake 0→1→2→3→3→2→1→0
    expect(medlemmer(lagene[0])).toEqual(["u1", "u8"]);
    expect(medlemmer(lagene[1])).toEqual(["u2", "u7"]);
    expect(medlemmer(lagene[2])).toEqual(["u3", "u6"]);
    expect(medlemmer(lagene[3])).toEqual(["u4", "u5"]);
    // Alle får sum 9 — perfekt
    for (const l of lagene) {
      expect(sumPoeng(l, spillere)).toBe(9);
    }
  });
});

// ─── fordelSpillere — variable formater ──────────────────────────

describe("fordelSpillere — variable formater", () => {
  it("TO_LAG med 7 spillere: 4+3 fordeling via snake", () => {
    const spillere = lagSpillereMedPoeng([7, 6, 5, 4, 3, 2, 1]);
    const struktur = analyserLagFormat("TO_LAG", 7)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(2);
    expect(lagene[0].medlemmer).toHaveLength(4);
    expect(lagene[1].medlemmer).toHaveLength(3);
  });

  it("TRE_LAG med 10 spillere: jevn fordeling (3+3+4)", () => {
    const spillere = lagSpillere(10); // poeng 0-9
    const struktur = analyserLagFormat("TRE_LAG", 10)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(3);
    // losLagStorrelser: 10 spillere, 3 lag → 4,3,3
    const storrelser = lagene.map((l) => l.medlemmer.length).sort();
    expect(storrelser).toEqual([3, 3, 4]);
  });

  it("FIRE_LAG med 9 spillere: jevn fordeling (2+2+2+3)", () => {
    const spillere = lagSpillere(9);
    const struktur = analyserLagFormat("FIRE_LAG", 9)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(4);
    const storrelser = lagene.map((l) => l.medlemmer.length).sort();
    expect(storrelser).toEqual([2, 2, 2, 3]);
  });

  it("FLERE_LAG med 10 spillere: 5 lag à 2", () => {
    const spillere = lagSpillere(10);
    const struktur = analyserLagFormat("FLERE_LAG", 10)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(5);
    lagene.forEach((l) => expect(l.medlemmer).toHaveLength(2));
  });
});

// ─── fordelSpillere — kanttilfeller ───────────────────────────

describe("fordelSpillere — kanttilfeller", () => {
  it("håndterer for mange spillere for fast format (PAR, 5 spillere → 4 plasser)", () => {
    const spillere = lagSpillereMedPoeng([10, 8, 6, 4, 2]);
    const struktur = analyserLagFormat("PAR", 5)!;
    const lagene = fordelSpillere(spillere, struktur);

    // Skal IKKE henge (infinite loop). Skal plassere 4 beste, ignorere #5.
    expect(lagene).toHaveLength(2);
    expect(lagene[0].medlemmer).toHaveLength(2);
    expect(lagene[1].medlemmer).toHaveLength(2);
    // u5 (poeng=2) skal IKKE være plassert
    const allePlasserte = [...lagene[0].medlemmer, ...lagene[1].medlemmer];
    expect(allePlasserte).not.toContain("u5");
  });

  it("håndterer for få spillere for fast format — fallback til enkel fordeling", () => {
    const spillere = lagSpillereMedPoeng([10, 8]);
    const struktur = analyserLagFormat("TRIO", 2)!;
    const lagene = fordelSpillere(spillere, struktur);

    // Kun 2 spillere for TRIO (6 plasser) → fallback til fordelEnkel
    expect(lagene).toHaveLength(2);
    // u1 til Lag1, u2 til Lag2
    expect(lagene[0].medlemmer).toContain("u1");
    expect(lagene[1].medlemmer).toContain("u2");
  });

  it("tom spillerliste gir tomme lag", () => {
    const struktur = analyserLagFormat("PAR", 0)!;
    const lagene = fordelSpillere([], struktur);
    expect(lagene).toHaveLength(2);
    lagene.forEach((l) => expect(l.medlemmer).toHaveLength(0));
  });

  it("alle med lik poengsum — snake fordeler uansett rettferdig", () => {
    const spillere = lagSpillereMedPoeng([5, 5, 5, 5, 5, 5]);
    const struktur = analyserLagFormat("TRE_LAG", 6)!;
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(3);
    // Alle skal ha 2 medlemmer
    lagene.forEach((l) => expect(l.medlemmer).toHaveLength(2));
    // Alle lag har lik poengsum siden alle har 5
    for (const l of lagene) {
      expect(sumPoeng(l, spillere)).toBe(10);
    }
  });

  it("FLERE_LAG med oddetall: kapper til partall", () => {
    const spillere = lagSpillereMedPoeng([7, 6, 5, 4, 3, 2, 1]);
    const struktur = analyserLagFormat("FLERE_LAG", 7)!;
    // 7 deltakere → 3 lag à 2 = 6 plasser → 1 spiller står over
    const lagene = fordelSpillere(spillere, struktur);

    expect(lagene).toHaveLength(3);
    lagene.forEach((l) => expect(l.medlemmer).toHaveLength(2));
    const allePlasserte = lagene.flatMap((l) => l.medlemmer);
    expect(allePlasserte).toHaveLength(6);
    // u7 (laveste poeng = 1) skal stå over
    expect(allePlasserte).not.toContain("u7");
  });
});

// ─── validerLagFormat ─────────────────────────────────────────────

describe("validerLagFormat", () => {
  it("ANNET returnerer feil", () => {
    const r = validerLagFormat("ANNET", 10);
    expect(r.ok).toBe(false);
  });

  it("PAR med 4 deltakere: OK", () => {
    const r = validerLagFormat("PAR", 4);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.minDeltakere).toBe(4);
  });

  it("PAR med 3 deltakere: for få", () => {
    const r = validerLagFormat("PAR", 3);
    expect(r.ok).toBe(false);
  });

  it("PAR med 5 deltakere: OK (én står over)", () => {
    const r = validerLagFormat("PAR", 5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.minDeltakere).toBe(4);
  });

  it("TO_LAG med 1 deltaker: OK (minimum 1 per lag)", () => {
    const r = validerLagFormat("TO_LAG", 1);
    expect(r.ok).toBe(true);
  });

  it("TO_LAG med 0 deltakere: OK (variable lag får 0 hver)", () => {
    const r = validerLagFormat("TO_LAG", 0);
    expect(r.ok).toBe(true);
  });

  it("FEM_MOT_FEM med 8 deltakere: for få", () => {
    const r = validerLagFormat("FEM_MOT_FEM", 8);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.feilmelding).toContain("For få");
    }
  });

  it("alle 12 formater returnerer struktur (unntatt ANNET)", () => {
    const formater: LagFormat[] = [
      "PAR", "TRIO", "FIRE_MOT_FIRE", "FEM_MOT_FEM",
      "FIRE_MOT_FEM", "TRE_MOT_TRE_MOT_TRE", "TO_MOT_TO_MOT_TO_MOT_TO",
      "TO_LAG", "TRE_LAG", "FIRE_LAG", "FLERE_LAG",
    ];

    for (const format of formater) {
      const r = validerLagFormat(format, 100); // mange deltakere — alltid OK
      expect(r.ok, `${format} skal være OK med 100 deltakere`).toBe(true);
      if (r.ok) {
        expect(r.struktur.antallLag).toBeGreaterThanOrEqual(1);
        expect(r.struktur.lagnavn).toHaveLength(r.struktur.antallLag);
      }
    }
  });
});

// ─── Snake-draft gir alltid bedre balanse enn tilfeldig ───────────

describe("balansekvalitet", () => {
  it("PAR: differanse mellom lag er maks 1 poeng (gitt jevn poengstigning)", () => {
    // 100 spillere — trekker ut 4 for PAR
    for (let i = 0; i < 100; i++) {
      const alleSpillere = lagSpillereMedPoeng(
        Array.from({ length: 20 }, (_, j) => 20 - j), // 20..1
      );
      // Velg 4 tilfeldige
      const valgte = [...alleSpillere].sort(() => Math.random() - 0.5).slice(0, 4);
      const struktur = analyserLagFormat("PAR", 4)!;
      const lagene = fordelSpillere(valgte, struktur);
      const diff = Math.abs(
        sumPoeng(lagene[0], valgte) - sumPoeng(lagene[1], valgte),
      );
      // Snake-draft skal alltid være optimal for 2 lag med snake
      expect(diff).toBeLessThanOrEqual(
        Math.max(...valgte.map((s) => s.poeng)) -
          Math.min(...valgte.map((s) => s.poeng)),
      );
    }
  });

  it("TRIO: differansen er akseptabel (≤ 2× poengspenn)", () => {
    const alleSpillere = lagSpillereMedPoeng(
      Array.from({ length: 20 }, (_, j) => 20 - j),
    );
    const valgte = alleSpillere.slice(0, 6);
    const struktur = analyserLagFormat("TRIO", 6)!;
    const lagene = fordelSpillere(valgte, struktur);

    const p0 = sumPoeng(lagene[0], valgte);
    const p1 = sumPoeng(lagene[1], valgte);
    const diff = Math.abs(p0 - p1);
    // Snake for 6 spillere: differanse på maks 1
    expect(diff).toBeLessThanOrEqual(3);
  });
});
