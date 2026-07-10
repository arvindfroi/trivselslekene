import { describe, expect, it } from "vitest";
import {
  hentStilling,
  hentKvalitetsledere,
  hentUtmerkelser,
  type SesongData,
} from "./stilling";

// ─── Hjelpefunksjoner for mock-data ────────────────────────────────

const b = (
  id: string,
  navn: string,
  bildeUrl: string | null = null,
  individuelle: {
    ovelseId: string;
    plassering: number | null;
    poeng: number;
    kvaliteter: string[];
  }[] = [],
  lag: {
    ovelseId: string;
    plassering: number | null;
    poeng: number;
    kvaliteter: string[];
  }[] = [],
  farge: string | null = null,
): SesongData["brukere"][number] => ({
  id,
  navn,
  bildeUrl,
  farge,
  individuelleResultater: individuelle.map((i) => ({
    id: `${id}-ind-${i.ovelseId}`,
    ovelseId: i.ovelseId,
    plassering: i.plassering,
    poeng: i.poeng,
    ovelse: { id: i.ovelseId, kvaliteter: i.kvaliteter as import("@prisma/client").Kvalitet[] },
  })),
  lagmedlemskap: lag.map((l) => ({
    lag: {
      ovelseId: l.ovelseId,
      resultat: { plassering: l.plassering, poeng: l.poeng },
      ovelse: {
        id: l.ovelseId,
        sesongId: "s1",
        kvaliteter: l.kvaliteter as import("@prisma/client").Kvalitet[],
      },
    },
  })),
});

// ─── hentStilling ──────────────────────────────────────────────────

describe("hentStilling", () => {
  it("tom input → tom liste", () => {
    const data: SesongData = { brukere: [], vertPerOvelse: [] };
    expect(hentStilling(data)).toEqual([]);
  });

  it("summerer poeng fra individuelle resultater", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [
          { ovelseId: "o1", plassering: 1, poeng: 10, kvaliteter: ["STYRKE"] },
          { ovelseId: "o2", plassering: 2, poeng: 8, kvaliteter: ["FLAKS"] },
        ]),
      ],
      vertPerOvelse: [],
    };
    const stilling = hentStilling(data);
    expect(stilling).toHaveLength(1);
    expect(stilling[0].totalPoeng).toBe(18);
    expect(stilling[0].navn).toBe("Alice");
  });

  it("summerer poeng fra lagmedlemskap", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [], [
          {
            ovelseId: "o1",
            plassering: 1,
            poeng: 15,
            kvaliteter: ["LAGSPILL"],
          },
        ]),
      ],
      vertPerOvelse: [],
    };
    const stilling = hentStilling(data);
    expect(stilling[0].totalPoeng).toBe(15);
  });

  it("summerer både individuelle og lag-poeng", () => {
    const data: SesongData = {
      brukere: [
        b(
          "u1",
          "Alice",
          null,
          [
            {
              ovelseId: "o1",
              plassering: 1,
              poeng: 10,
              kvaliteter: ["STYRKE"],
            },
          ],
          [
            {
              ovelseId: "o2",
              plassering: 1,
              poeng: 15,
              kvaliteter: ["LAGSPILL"],
            },
          ],
        ),
      ],
      vertPerOvelse: [],
    };
    expect(hentStilling(data)[0].totalPoeng).toBe(25);
  });

  it("sorterer høyest poeng først", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [
          { ovelseId: "o1", plassering: 2, poeng: 5, kvaliteter: ["FLAKS"] },
        ]),
        b("u2", "Bob", null, [
          { ovelseId: "o1", plassering: 1, poeng: 10, kvaliteter: ["FLAKS"] },
        ]),
        b("u3", "Charlie", null, [
          { ovelseId: "o1", plassering: 3, poeng: 3, kvaliteter: ["FLAKS"] },
        ]),
      ],
      vertPerOvelse: [],
    };
    const stilling = hentStilling(data);
    expect(stilling[0].navn).toBe("Bob");
    expect(stilling[1].navn).toBe("Alice");
    expect(stilling[2].navn).toBe("Charlie");
  });

  it("bildeUrl er null når bildeUrl er null", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [
          { ovelseId: "o1", plassering: 1, poeng: 10, kvaliteter: ["FLAKS"] },
        ]),
      ],
      vertPerOvelse: [],
    };
    expect(hentStilling(data)[0].bildeUrl).toBeNull();
  });

  it("konverterer bildeUrl via bildeUrlFor når satt", () => {
    // bildeUrlFor kalles i hentAlleSesongData (DB-laget), ikke i hentStilling.
    // hentStilling sender bare bildeUrl rett gjennom.
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", "/api/bilde/bruker/u1?v=abc", [
          { ovelseId: "o1", plassering: 1, poeng: 10, kvaliteter: ["FLAKS"] },
        ]),
      ],
      vertPerOvelse: [],
    };
    expect(hentStilling(data)[0].bildeUrl).toBe("/api/bilde/bruker/u1?v=abc");
  });

  it("antallOvelser teller unike øvelser (individuelt + lag)", () => {
    const data: SesongData = {
      brukere: [
        b(
          "u1",
          "Alice",
          null,
          [
            {
              ovelseId: "o1",
              plassering: 1,
              poeng: 10,
              kvaliteter: ["STYRKE"],
            },
            {
              ovelseId: "o2",
              plassering: 2,
              poeng: 5,
              kvaliteter: ["FLAKS"],
            },
          ],
          [
            {
              ovelseId: "o2",
              plassering: 1,
              poeng: 15,
              kvaliteter: ["LAGSPILL"],
            },
            {
              ovelseId: "o3",
              plassering: 2,
              poeng: 10,
              kvaliteter: ["TAKTIKK"],
            },
          ],
        ),
      ],
      vertPerOvelse: [],
    };
    // o1, o2 (individuelt) + o2, o3 (lag) = 3 unike
    expect(hentStilling(data)[0].antallOvelser).toBe(3);
  });
});

// ─── hentKvalitetsledere ───────────────────────────────────────────

describe("hentKvalitetsledere", () => {
  it("returnerer 10 kvaliteter, selv uten data", () => {
    const data: SesongData = { brukere: [], vertPerOvelse: [] };
    const ledere = hentKvalitetsledere(data);
    expect(ledere).toHaveLength(10);
    // Alle har leder: null
    for (const l of ledere) {
      expect(l.leder).toBeNull();
      expect(l.topp3).toHaveLength(0);
    }
  });

  it("finner riktig leder per kvalitet basert på poeng", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [
          {
            ovelseId: "o1",
            plassering: 1,
            poeng: 10,
            kvaliteter: ["STYRKE"],
          },
        ]),
        b("u2", "Bob", null, [
          {
            ovelseId: "o1",
            plassering: 2,
            poeng: 5,
            kvaliteter: ["STYRKE"],
          },
        ]),
      ],
      vertPerOvelse: [],
    };
    const ledere = hentKvalitetsledere(data);
    const styrke = ledere.find((l) => l.kvalitet === "STYRKE")!;
    expect(styrke.leder).not.toBeNull();
    expect(styrke.leder!.navn).toBe("Alice");
    expect(styrke.leder!.poeng).toBe(10);
    expect(styrke.topp3).toHaveLength(2);
  });

  it("lag-poeng teller også for kvalitetsledere", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [], [
          {
            ovelseId: "o1",
            plassering: 1,
            poeng: 20,
            kvaliteter: ["LAGSPILL"],
          },
        ]),
        b("u2", "Bob", null, [
          {
            ovelseId: "o1",
            plassering: 1,
            poeng: 10,
            kvaliteter: ["LAGSPILL"],
          },
        ]),
      ],
      vertPerOvelse: [],
    };
    const ledere = hentKvalitetsledere(data);
    const lagspill = ledere.find((l) => l.kvalitet === "LAGSPILL")!;
    expect(lagspill.leder!.navn).toBe("Alice");
    expect(lagspill.leder!.poeng).toBe(20);
  });
});

// ─── hentUtmerkelser ───────────────────────────────────────────────

describe("hentUtmerkelser", () => {
  it("returnerer array (ikke krasj) for tom data", () => {
    const data: SesongData = { brukere: [], vertPerOvelse: [] };
    const utmerkelser = hentUtmerkelser(data);
    expect(Array.isArray(utmerkelser)).toBe(true);
    expect(utmerkelser.length).toBeGreaterThan(0);
    // Alle har leder: null for tom data
    for (const u of utmerkelser) {
      expect(u.leder).toBeNull();
      expect(u.topp3).toHaveLength(0);
    }
  });

  it("\"Flest kamper\" finner brukeren med høyest antall kamper", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [
          {
            ovelseId: "o1",
            plassering: 1,
            poeng: 10,
            kvaliteter: ["STYRKE"],
          },
          {
            ovelseId: "o2",
            plassering: 1,
            poeng: 10,
            kvaliteter: ["FLAKS"],
          },
        ]),
        b("u2", "Bob", null, [
          {
            ovelseId: "o1",
            plassering: 2,
            poeng: 5,
            kvaliteter: ["STYRKE"],
          },
        ]),
      ],
      vertPerOvelse: [],
    };
    const utmerkelser = hentUtmerkelser(data);
    const kamper = utmerkelser.find((u) => u.key === "kamper")!;
    expect(kamper.leder).not.toBeNull();
    expect(kamper.leder!.navn).toBe("Alice");
    expect(kamper.leder!.verdi).toBe("2 kamper");
  });

  it("\"Flest seire\" finner brukeren med høyest antall seire", () => {
    const data: SesongData = {
      brukere: [
        b("u1", "Alice", null, [
          {
            ovelseId: "o1",
            plassering: 1,
            poeng: 10,
            kvaliteter: ["STYRKE"],
          },
          {
            ovelseId: "o2",
            plassering: 1,
            poeng: 10,
            kvaliteter: ["FLAKS"],
          },
        ]),
        b("u2", "Bob", null, [
          {
            ovelseId: "o1",
            plassering: 2,
            poeng: 5,
            kvaliteter: ["STYRKE"],
          },
        ]),
      ],
      vertPerOvelse: [],
    };
    const utmerkelser = hentUtmerkelser(data);
    const seire = utmerkelser.find((u) => u.key === "seire")!;
    expect(seire.leder!.navn).toBe("Alice");
    expect(seire.leder!.verdi).toBe("2 seire");
  });
});
