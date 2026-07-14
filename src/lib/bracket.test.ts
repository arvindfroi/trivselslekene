import { describe, expect, it } from "vitest";
import { bracketSlots, seedRekkefolge, wr1Par, winnersRunder, losersRunder } from "./bracket";

describe("bracketSlots", () => {
  it("kaster feil for ugyldig antall deltagere", () => {
    expect(() => bracketSlots(3)).toThrow();
    expect(() => bracketSlots(6)).toThrow();
    expect(() => bracketSlots(10)).toThrow();
  });

  describe("4 deltagere", () => {
    it("returnerer totalt 6 slots", () => {
      expect(bracketSlots(4)).toHaveLength(6);
    });

    it("Winners bracket: 3 slots (2 + 1)", () => {
      const winners = bracketSlots(4).filter((s) => s.bracket === "W");
      expect(winners).toHaveLength(3);
      expect(winners.filter((s) => s.runde === 1)).toHaveLength(2);
      expect(winners.filter((s) => s.runde === 2)).toHaveLength(1);
    });

    it("Losers bracket: 2 slots (1 + 1)", () => {
      const losers = bracketSlots(4).filter((s) => s.bracket === "L");
      expect(losers).toHaveLength(2);
      expect(losers.filter((s) => s.runde === 1)).toHaveLength(1);
      expect(losers.filter((s) => s.runde === 2)).toHaveLength(1);
    });
  });

  describe("8 deltagere", () => {
    it("returnerer totalt 14 slots", () => {
      expect(bracketSlots(8)).toHaveLength(14);
    });

    it("Winners bracket: 7 slots (4 + 2 + 1)", () => {
      const winners = bracketSlots(8).filter((s) => s.bracket === "W");
      expect(winners).toHaveLength(7);
      expect(winners.filter((s) => s.runde === 1)).toHaveLength(4);
      expect(winners.filter((s) => s.runde === 2)).toHaveLength(2);
      expect(winners.filter((s) => s.runde === 3)).toHaveLength(1);
    });

    it("Losers bracket: 6 slots (2 + 2 + 1 + 1)", () => {
      const losers = bracketSlots(8).filter((s) => s.bracket === "L");
      expect(losers).toHaveLength(6);
      expect(losers.filter((s) => s.runde === 1)).toHaveLength(2);
      expect(losers.filter((s) => s.runde === 2)).toHaveLength(2);
      expect(losers.filter((s) => s.runde === 3)).toHaveLength(1);
      expect(losers.filter((s) => s.runde === 4)).toHaveLength(1);
    });

    it("Alle slots i losers har unike runde+posisjon", () => {
      const slots = bracketSlots(8);
      const losers = slots.filter((s) => s.bracket === "L");
      const keys = losers.map((s) => `${s.runde}-${s.posisjon}`);
      expect(new Set(keys).size).toBe(losers.length);
    });
  });

  describe("16 deltagere", () => {
    it("returnerer totalt 30 slots", () => {
      expect(bracketSlots(16)).toHaveLength(30);
    });

    it("Winners bracket: 15 slots (8 + 4 + 2 + 1)", () => {
      const winners = bracketSlots(16).filter((s) => s.bracket === "W");
      expect(winners).toHaveLength(15);
      expect(winners.filter((s) => s.runde === 1)).toHaveLength(8);
      expect(winners.filter((s) => s.runde === 2)).toHaveLength(4);
      expect(winners.filter((s) => s.runde === 3)).toHaveLength(2);
      expect(winners.filter((s) => s.runde === 4)).toHaveLength(1);
    });

    it("Losers bracket: 14 slots (4 + 4 + 2 + 2 + 1 + 1)", () => {
      const losers = bracketSlots(16).filter((s) => s.bracket === "L");
      expect(losers).toHaveLength(14);
      expect(losers.filter((s) => s.runde === 1)).toHaveLength(4);
      expect(losers.filter((s) => s.runde === 2)).toHaveLength(4);
      expect(losers.filter((s) => s.runde === 3)).toHaveLength(2);
      expect(losers.filter((s) => s.runde === 4)).toHaveLength(2);
      expect(losers.filter((s) => s.runde === 5)).toHaveLength(1);
      expect(losers.filter((s) => s.runde === 6)).toHaveLength(1);
    });
  });

  it("Alle slots har gyldig bracket-type", () => {
    for (const N of [4, 8, 16]) {
      for (const slot of bracketSlots(N)) {
        expect(["W", "L", "G"]).toContain(slot.bracket);
      }
    }
  });
});

describe("seedRekkefolge", () => {
  it("N=4: [1,4,2,3]", () => {
    expect(seedRekkefolge(4)).toEqual([1, 4, 2, 3]);
  });

  it("N=8: [1,8,4,5,2,7,3,6]", () => {
    expect(seedRekkefolge(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("N=16: starter med 1,16 og slutter med 2,15", () => {
    const seeds = seedRekkefolge(16);
    expect(seeds).toHaveLength(16);
    expect(seeds[0]).toBe(1);
    expect(seeds[1]).toBe(16);
    expect(seeds[14]).toBe(6);
    expect(seeds[15]).toBe(11);
  });
});

describe("wr1Par", () => {
  it("N=8 gir 4 par", () => {
    const par = wr1Par(8);
    expect(par).toHaveLength(4);
    expect(par[0]).toEqual([1, 8, 1]);
    expect(par[1]).toEqual([4, 5, 2]);
    expect(par[2]).toEqual([2, 7, 3]);
    expect(par[3]).toEqual([3, 6, 4]);
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
