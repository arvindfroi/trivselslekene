import { describe, expect, it } from "vitest";
import { bildeUrlFor, type MedBilde } from "./bilde";

describe("bildeUrlFor", () => {
  it("returnerer null når rad.bildeUrl er null", () => {
    const rad: MedBilde = { id: "u1", bildeUrl: null };
    expect(bildeUrlFor("bruker", rad)).toBeNull();
  });

  it("returnerer /api/bilde/{type}/{id}?v={hash} for data:-URL-er", () => {
    const rad: MedBilde = {
      id: "abc123",
      bildeUrl: "data:image/png;base64,iVBORw0KGgo==",
    };
    const url = bildeUrlFor("bruker", rad);
    expect(url).not.toBeNull();
    expect(url).toMatch(/^\/api\/bilde\/bruker\/abc123\?v=/);
  });

  it("returnerer /api/bilde/{type}/{id}?v={hash} for lange data:-URL-er (500 kB+)", () => {
    // Simuler en stor base64-streng — fingeravtrykk skal fortsatt fungere
    const stor = "data:image/png;base64," + "A".repeat(500_000);
    const rad: MedBilde = { id: "stor", bildeUrl: stor };
    const url = bildeUrlFor("bruker", rad);
    expect(url).toMatch(/^\/api\/bilde\/bruker\/stor\?v=/);
  });

  it("ekte URL-er (https://...) slippes rett gjennom", () => {
    const rad: MedBilde = {
      id: "u2",
      bildeUrl: "https://example.com/bilde.png",
    };
    expect(bildeUrlFor("bruker", rad)).toBe("https://example.com/bilde.png");
  });

  it("ulike typer gir riktig path", () => {
    const rad: MedBilde = {
      id: "abc",
      bildeUrl: "data:image/png;base64,xxx",
    };

    expect(bildeUrlFor("bruker", rad)).toMatch(/^\/api\/bilde\/bruker\//);
    expect(bildeUrlFor("ovelse", rad)).toMatch(/^\/api\/bilde\/ovelse\//);
    expect(bildeUrlFor("fase", rad)).toMatch(/^\/api\/bilde\/fase\//);
  });

  it("samme input gir samme fingerprint (deterministisk)", () => {
    const rad: MedBilde = {
      id: "abc",
      bildeUrl: "data:image/png;base64,iVBORw0KGgo==",
    };
    const a = bildeUrlFor("bruker", rad);
    const b = bildeUrlFor("bruker", rad);
    expect(a).toBe(b);
  });
});
