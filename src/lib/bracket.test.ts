import { describe, expect, it } from "vitest";
import {
  bracketSlots,
  bracketSize,
  antallByes,
  wr1Matches,
  seedRekkefolge,
  wr1Par,
  byeSeeds,
  winnersRunder,
  losersRunder,
  expectedSeedMap,
} from "./bracket";

describe("bracketSize", () => {
  it("N<4 gir alltid 4", () => {
    expect(bracketSize(1)).toBe(4);
    expect(bracketSize(2)).toBe(4);
    expect(bracketSize(3)).toBe(4);
  });
  it("4→4, 5→8, 8→8, 9→16, 16→16, 17→32", () => {
    expect(bracketSize(4)).toBe(4);
    expect(bracketSize(5)).toBe(8);
    expect(bracketSize(8)).toBe(8);
    expect(bracketSize(9)).toBe(16);
    expect(bracketSize(16)).toBe(16);
    expect(bracketSize(17)).toBe(32);
  });
});

describe("antallByes", () => {
  it("9 deltagere → 7 byes", () => expect(antallByes(9)).toBe(7));
  it("5 deltagere → 3 byes", () => expect(antallByes(5)).toBe(3));
  it("8 deltagere → 0 byes", () => expect(antallByes(8)).toBe(0));
  it("4 deltagere → 0 byes", () => expect(antallByes(4)).toBe(0));
});

describe("wr1Matches", () => {
  it("9 deltagere → 1 kamp i WR1", () => expect(wr1Matches(9)).toBe(1));
  it("5 deltagere → 1 kamp", () => expect(wr1Matches(5)).toBe(1));
  it("10 deltagere → 2 kamper", () => expect(wr1Matches(10)).toBe(2));
  it("8 deltagere → 4 kamper", () => expect(wr1Matches(8)).toBe(4));
});

describe("byeSeeds", () => {
  it("9 deltagere: seeds 1-7 (unntatt 8 og 9) får bye", () => {
    // P=16 seed order: [1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11]
    // Real≤9: 1,8,9,4,5,2,7,3,6. Pairs: (1,16)=bye, (8,9)=match, (4,13)=bye, ...
    expect(byeSeeds(9)).toEqual([1, 4, 5, 2, 7, 3, 6]);
  });
  it("5 deltagere: seeds 1,2,3 får bye", () => {
    expect(byeSeeds(5)).toEqual([1, 2, 3]);
  });
  it("8 deltagere: ingen byes", () => {
    expect(byeSeeds(8)).toEqual([]);
  });
});

describe("bracketSlots", () => {
  it("kaster feil for ikke-2-potens", () => {
    expect(() => bracketSlots(3)).toThrow();
    expect(() => bracketSlots(6)).toThrow();
    expect(() => bracketSlots(10)).toThrow();
  });

  describe("P=4", () => {
    it("6 slots", () => expect(bracketSlots(4)).toHaveLength(6));
    it("W: 3 (2+1)", () => {
      const w = bracketSlots(4).filter((s) => s.bracket === "W");
      expect(w).toHaveLength(3);
      expect(w.filter((s) => s.runde === 1)).toHaveLength(2);
      expect(w.filter((s) => s.runde === 2)).toHaveLength(1);
    });
  });

  describe("P=8", () => {
    it("14 slots", () => expect(bracketSlots(8)).toHaveLength(14));
    it("W: 7 (4+2+1)", () => {
      const w = bracketSlots(8).filter((s) => s.bracket === "W");
      expect(w).toHaveLength(7);
    });
    it("L: 6 (2+2+1+1)", () => {
      const l = bracketSlots(8).filter((s) => s.bracket === "L");
      expect(l).toHaveLength(6);
    });
  });

  describe("P=16", () => {
    it("30 slots", () => expect(bracketSlots(16)).toHaveLength(30));
  });

  it("alle slots har gyldig bracket", () => {
    for (const P of [4, 8, 16, 32]) {
      for (const slot of bracketSlots(P)) {
        expect(["W", "L", "G"]).toContain(slot.bracket);
      }
    }
  });
});

describe("seedRekkefolge", () => {
  it("P=4: [1,4,2,3]", () => expect(seedRekkefolge(4)).toEqual([1, 4, 2, 3]));
  it("P=8: [1,8,4,5,2,7,3,6]", () => expect(seedRekkefolge(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]));
  it("P=16: 16 elementer, starter 1,16", () => {
    const s = seedRekkefolge(16);
    expect(s).toHaveLength(16);
    expect(s[0]).toBe(1);
    expect(s[1]).toBe(16);
  });
});

describe("wr1Par", () => {
  it("N=8 (P=8): 4 par", () => {
    const par = wr1Par(8);
    expect(par).toHaveLength(4);
    expect(par[0]).toEqual([1, 8, 1]);
    expect(par[1]).toEqual([4, 5, 2]);
    expect(par[2]).toEqual([2, 7, 3]);
    expect(par[3]).toEqual([3, 6, 4]);
  });

  it("N=9 (P=16, 7 byes): 1 kamp — seeds 8 vs 9 på bracket-pos 2", () => {
    const par = wr1Par(9);
    expect(par).toHaveLength(1);
    expect(par[0]).toEqual([8, 9, 2]);
  });

  it("N=5 (P=8, 3 byes): 1 kamp — seeds 4 vs 5 på bracket-pos 2", () => {
    const par = wr1Par(5);
    expect(par).toHaveLength(1);
    expect(par[0]).toEqual([4, 5, 2]);
  });
});

describe("hjelpere", () => {
  it("winnersRunder", () => {
    expect(winnersRunder(4)).toBe(2);
    expect(winnersRunder(8)).toBe(3);
    expect(winnersRunder(16)).toBe(4);
  });
  it("losersRunder", () => {
    expect(losersRunder(4)).toBe(2);
    expect(losersRunder(8)).toBe(4);
    expect(losersRunder(16)).toBe(6);
  });
});

describe("expectedSeedMap", () => {
  // Hjelpefunksjon for å lese slot
  const s = (map: ReturnType<typeof expectedSeedMap>, b: string, r: number, p: number) =>
    map.get(`${b}-${r}-${p}`)!;

  it("WR1 mapping for P=8, N=8", () => {
    const m = expectedSeedMap(8, 8);
    // seedRekkefolge(8) = [1,8,4,5,2,7,3,6]
    expect(s(m, "W", 1, 1)).toEqual({ d1: 1, d2: 8 });
    expect(s(m, "W", 1, 2)).toEqual({ d1: 4, d2: 5 });
    expect(s(m, "W", 1, 3)).toEqual({ d1: 2, d2: 7 });
    expect(s(m, "W", 1, 4)).toEqual({ d1: 3, d2: 6 });
  });

  it("WR2 for P=8, N=8 — winners advance", () => {
    const m = expectedSeedMap(8, 8);
    expect(s(m, "W", 2, 1)).toEqual({ d1: 1, d2: 4 });
    expect(s(m, "W", 2, 2)).toEqual({ d1: 2, d2: 3 });
  });

  it("WR3 (final) for P=8, N=8", () => {
    const m = expectedSeedMap(8, 8);
    expect(s(m, "W", 3, 1)).toEqual({ d1: 1, d2: 2 });
  });

  it("LR1 for P=8, N=8 — losers from WR1", () => {
    const m = expectedSeedMap(8, 8);
    expect(s(m, "L", 1, 1)).toEqual({ d1: 8, d2: 5 });
    expect(s(m, "L", 1, 2)).toEqual({ d1: 7, d2: 6 });
  });

  it("Grand finals for P=8, N=8", () => {
    const m = expectedSeedMap(8, 8);
    // W-vinner (1) vs L-vinner (2)
    expect(s(m, "G", 1, 1)).toEqual({ d1: 1, d2: 2 });
  });

  it("alle slots har entries", () => {
    const P = 8;
    const m = expectedSeedMap(P, 8);
    const slots = bracketSlots(P);
    for (const slot of slots) {
      expect(m.get(`${slot.bracket}-${slot.runde}-${slot.posisjon}`)).toBeDefined();
    }
  });

  it("byes i N=5, P=8", () => {
    const m = expectedSeedMap(8, 5);
    // seeds: [1,8,4,5,2,7,3,6] — kun 1-5 er reelle
    expect(s(m, "W", 1, 1)).toEqual({ d1: 1, d2: null }); // seed 8 > 5 → null
    expect(s(m, "W", 1, 2)).toEqual({ d1: 4, d2: 5 });
    expect(s(m, "W", 1, 3)).toEqual({ d1: 2, d2: null }); // seed 7 > 5 → null
    expect(s(m, "W", 1, 4)).toEqual({ d1: 3, d2: null }); // seed 6 > 5 → null
  });
});
