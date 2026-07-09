import { describe, expect, it } from "vitest";
import { bracketSlots } from "./bracket";

describe("bracketSlots", () => {
  it("returnerer totalt 14 slots", () => {
    const slots = bracketSlots();
    expect(slots).toHaveLength(14);
  });

  it("Winners bracket: 7 slots (4 + 2 + 1)", () => {
    const slots = bracketSlots();
    const winners = slots.filter((s) => s.bracket === "W");
    expect(winners).toHaveLength(7);

    // 4 i runde 1
    expect(winners.filter((s) => s.runde === 1)).toHaveLength(4);
    // 2 i runde 2
    expect(winners.filter((s) => s.runde === 2)).toHaveLength(2);
    // 1 i runde 3
    expect(winners.filter((s) => s.runde === 3)).toHaveLength(1);
  });

  it("Losers bracket: 6 slots (2 + 2 + 1 + 1)", () => {
    const slots = bracketSlots();
    const losers = slots.filter((s) => s.bracket === "L");
    expect(losers).toHaveLength(6);

    // 2 i runde 1
    expect(losers.filter((s) => s.runde === 1)).toHaveLength(2);
    // 2 i runde 2
    expect(losers.filter((s) => s.runde === 2)).toHaveLength(2);
    // 1 i runde 3
    expect(losers.filter((s) => s.runde === 3)).toHaveLength(1);
    // 1 i runde 4
    expect(losers.filter((s) => s.runde === 4)).toHaveLength(1);
  });

  it("Grand Finals: 1 slot", () => {
    const slots = bracketSlots();
    const gf = slots.filter((s) => s.bracket === "G");
    expect(gf).toHaveLength(1);
    expect(gf[0]).toEqual({ bracket: "G", runde: 1, posisjon: 1 });
  });

  it("Alle slots i losers har unike runde+posisjon", () => {
    const slots = bracketSlots();
    const losers = slots.filter((s) => s.bracket === "L");
    const keys = losers.map((s) => `${s.runde}-${s.posisjon}`);
    const unike = new Set(keys);
    expect(unike.size).toBe(losers.length);
  });

  it("Alle slots har gyldig bracket-type (W, L eller G)", () => {
    const slots = bracketSlots();
    const gyldige = ["W", "L", "G"];
    for (const slot of slots) {
      expect(gyldige).toContain(slot.bracket);
    }
  });
});
