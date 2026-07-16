import { describe, it, expect } from "vitest";
import {
  FJORARET_DELTAKERE,
  FJORARET_LEKER,
  fjoraretStilling,
  fjoraretVinner,
} from "@/lib/fjoraaret";

describe("fjoråret (2025)", () => {
  it("summerer til nøyaktig de samme totalene som regnearket", () => {
    // Fasit hentet direkte fra bunnraden i regnearket.
    const fasit: Record<string, number> = {
      Ruben: 47,
      Arvind: 43,
      Morten: 30,
      Eivind: 55,
      Fridrik: 54,
      Emil: 28,
      Fredrik: 34,
      Lars: 40,
      Adrian: 29,
      My: 23,
    };
    const stilling = fjoraretStilling();
    for (const rad of stilling) {
      expect(rad.totalPoeng, `total for ${rad.navn}`).toBe(fasit[rad.navn]);
    }
  });

  it("kårer Eivind til fjorårets mester med Fridrik ett poeng bak", () => {
    const stilling = fjoraretStilling();
    expect(fjoraretVinner().navn).toBe("Eivind");
    expect(stilling[0].plass).toBe(1);
    expect(stilling[1].navn).toBe("Fridrik");
    expect(stilling[0].totalPoeng - stilling[1].totalPoeng).toBe(1);
  });

  it("holder verten utenfor sin egen lek, men teller «Marble lek» for alle", () => {
    // Verten skal aldri ha poeng i leken sin.
    for (const lek of FJORARET_LEKER) {
      if (lek.vert) expect(lek.poeng[lek.vert]).toBeUndefined();
    }
    // Marble lek var maskinstyrt — alle ti deltok.
    const marble = FJORARET_LEKER.find((l) => l.navn === "Marble lek");
    expect(marble && Object.keys(marble.poeng).length).toBe(FJORARET_DELTAKERE.length);
  });

  it("regner «Emils lek» som ikke gjennomført", () => {
    const emils = FJORARET_LEKER.find((l) => l.vert === "Emil");
    expect(emils?.gjennomfort).toBe(false);
    // Ingen deltok, og den skal ikke telle som en spilt lek for noen.
    const stilling = fjoraretStilling();
    // Ni gjennomførte leker; ingen kan ha deltatt i flere enn det.
    for (const rad of stilling) expect(rad.antallLeker).toBeLessThanOrEqual(9);
  });
});
