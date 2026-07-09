import { describe, expect, it } from "vitest";
import {
  lagFormatValg,
  lagFormatTekst,
  ALLE_KVALITETER,
  kvalitetTekst,
  kvalitetIkon,
  kvalitetValg,
  statusTekst,
  statusVariant,
} from "./ovelseLabels";

describe("ovelseLabels", () => {
  describe("lagFormatValg / lagFormatTekst", () => {
    it("alle lagFormatValg har tekst i lagFormatTekst", () => {
      for (const valg of lagFormatValg) {
        expect(lagFormatTekst[valg.verdi]).toBeDefined();
        expect(typeof lagFormatTekst[valg.verdi]).toBe("string");
      }
    });
  });

  describe("kvalitet-mappings", () => {
    it("ALLE_KVALITETER -> alle har tekst i kvalitetTekst", () => {
      for (const k of ALLE_KVALITETER) {
        expect(kvalitetTekst[k]).toBeDefined();
        expect(typeof kvalitetTekst[k]).toBe("string");
      }
    });

    it("ALLE_KVALITETER -> alle har ikon i kvalitetIkon", () => {
      for (const k of ALLE_KVALITETER) {
        expect(kvalitetIkon[k]).toBeDefined();
        // Lucide-ikoner er React-komponenter (objects), ikke vanlige funksjoner
        expect(typeof kvalitetIkon[k]).toBe("object");
      }
    });

    it("ALLE_KVALITETER har 10 elementer, ingen duplikater", () => {
      expect(ALLE_KVALITETER).toHaveLength(10);
      expect(new Set(ALLE_KVALITETER).size).toBe(10);
    });

    it("kvalitetValg har like mange som ALLE_KVALITETER", () => {
      expect(kvalitetValg).toHaveLength(ALLE_KVALITETER.length);
    });

    it("alle kvalitetValg har tittel og Ikon", () => {
      for (const valg of kvalitetValg) {
        expect(valg.tittel).toBeDefined();
        expect(typeof valg.tittel).toBe("string");
        expect(valg.Ikon).toBeDefined();
        // Lucide-ikoner er React-komponenter (objects), ikke vanlige funksjoner
        expect(typeof valg.Ikon).toBe("object");
      }
    });
  });

  describe("OvelseStatus", () => {
    it("PLANLAGT har tekst og variant", () => {
      expect(statusTekst.PLANLAGT).toBe("Planlagt");
      expect(statusVariant.PLANLAGT).toBe("planlagt");
    });

    it("PAAGAAR har tekst og variant", () => {
      expect(statusTekst.PAAGAAR).toBe("Pågår");
      expect(statusVariant.PAAGAAR).toBe("pagaar");
    });

    it("FULLFORT har tekst og variant", () => {
      expect(statusTekst.FULLFORT).toBe("Fullført");
      expect(statusVariant.FULLFORT).toBe("fullfort");
    });
  });
});
