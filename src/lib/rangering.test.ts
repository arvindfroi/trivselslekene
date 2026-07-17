import { describe, expect, it } from "vitest";
import {
  beregnPlasseringer,
  standardPoengFor,
  type PlasseringInfo,
} from "@/lib/rangering";

/** Hjelper: poeng hver rad faktisk får (uten bonus). */
function poeng(delPlass: boolean[]): number[] {
  return beregnPlasseringer(delPlass).map((p) => standardPoengFor(p.poengPlassering));
}

describe("standardPoengFor", () => {
  it("gir standardskjemaet for plass 1–8", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(standardPoengFor)).toEqual([
      10, 8, 6, 5, 4, 3, 2, 1,
    ]);
  });

  it("gir 0 for plass utenfor skjemaet og ugyldige plasser", () => {
    expect(standardPoengFor(9)).toBe(0);
    expect(standardPoengFor(0)).toBe(0);
    expect(standardPoengFor(-1)).toBe(0);
  });
});

describe("beregnPlasseringer", () => {
  it("gir fortløpende plasseringer uten uavgjort", () => {
    const res = beregnPlasseringer([false, false, false]);
    expect(res.map((r) => r.plassering)).toEqual([1, 2, 3]);
    expect(res.map((r) => r.poengPlassering)).toEqual([1, 2, 3]);
    expect(poeng([false, false, false])).toEqual([10, 8, 6]);
  });

  it("to som deler 1. og 2. plass får begge den laveste poengsummen (8)", () => {
    // Kjernekravet fra tilbakemeldingen.
    const res = beregnPlasseringer([false, true, false]);
    expect(res.map((r) => r.plassering)).toEqual([1, 1, 3]);
    expect(res.map((r) => r.poengPlassering)).toEqual([2, 2, 3]);
    expect(poeng([false, true, false])).toEqual([8, 8, 6]);
  });

  it("tre som deler 1.–3. plass får alle 3.-plass-poengene (6)", () => {
    const res = beregnPlasseringer([false, true, true, false]);
    expect(res.map((r) => r.plassering)).toEqual([1, 1, 1, 4]);
    expect(res.map((r) => r.poengPlassering)).toEqual([3, 3, 3, 4]);
    expect(poeng([false, true, true, false])).toEqual([6, 6, 6, 5]);
  });

  it("håndterer uavgjort lenger ned i lista", () => {
    // Rad 3 og 4 deler 3.–4. plass → begge får 5 poeng.
    expect(poeng([false, false, false, true])).toEqual([10, 8, 5, 5]);
  });

  it("håndterer to separate uavgjort-grupper", () => {
    const delPlass = [false, true, false, true, false];
    const res = beregnPlasseringer(delPlass);
    expect(res.map((r) => r.plassering)).toEqual([1, 1, 3, 3, 5]);
    expect(poeng(delPlass)).toEqual([8, 8, 5, 5, 4]);
  });

  it("gir tom liste for ingen rader", () => {
    expect(beregnPlasseringer([])).toEqual<PlasseringInfo[]>([]);
  });
});
