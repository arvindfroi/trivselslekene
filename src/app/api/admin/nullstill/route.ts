import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * MIDLERTIDIG opprydding før lekene 2026 starter: fjerner alle brukere og alle
 * leker/turneringer/resultater som ble lagt inn mens appen ble testet.
 *
 * Sesongene beholdes (de er bare årganger, ikke testdata), og fjorårets
 * resultater ligger uansett i koden (`src/lib/fjoraaret.ts`), ikke i
 * databasen — de er derfor ikke berørt.
 *
 * GET  = tørrkjøring: teller hva som ville blitt slettet, uten å slette.
 * POST = sletter, med { key, bekreft: "NULLSTILL" } i body.
 *
 * Ruten skal fjernes igjen så snart nullstillingen er kjørt.
 */

const ADMIN_KEY = "nullstill-for-lekene-2026-midlg";

/** Rekkefølgen er styrt av fremmednøklene: barn før foreldre. */
async function tellAlt() {
  const [
    resultatIndividuell,
    resultatLag,
    lagMedlem,
    lag,
    ovelseFase,
    turneringsKamp,
    turneringsDeltager,
    ovelse,
    turnering,
    user,
    sesong,
  ] = await Promise.all([
    prisma.resultatIndividuell.count(),
    prisma.resultatLag.count(),
    prisma.lagMedlem.count(),
    prisma.lag.count(),
    prisma.ovelseFase.count(),
    prisma.turneringsKamp.count(),
    prisma.turneringsDeltager.count(),
    prisma.ovelse.count(),
    prisma.turnering.count(),
    prisma.user.count(),
    prisma.sesong.count(),
  ]);

  return {
    resultatIndividuell,
    resultatLag,
    lagMedlem,
    lag,
    ovelseFase,
    turneringsKamp,
    turneringsDeltager,
    ovelse,
    turnering,
    user,
    sesong,
  };
}

export async function GET() {
  const [antall, brukere, ovelser, sesonger] = await Promise.all([
    tellAlt(),
    prisma.user.findMany({ select: { navn: true }, orderBy: { navn: "asc" } }),
    prisma.ovelse.findMany({ select: { navn: true }, orderBy: { navn: "asc" } }),
    prisma.sesong.findMany({ select: { aar: true, navn: true, aktiv: true } }),
  ]);

  return NextResponse.json(
    {
      torrkjoring: true,
      antall,
      brukere: brukere.map((b) => b.navn),
      ovelser: ovelser.map((o) => o.navn),
      // Sesongene beholdes — listes bare så det er synlig hva som blir stående.
      sesongerSomBeholdes: sesonger,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const { key, bekreft } = await req.json();

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, feil: "Ugyldig admin-nøkkel." }, { status: 403 });
  }
  if (bekreft !== "NULLSTILL") {
    return NextResponse.json(
      { ok: false, feil: 'Mangler bekreftelse. Send { bekreft: "NULLSTILL" }.' },
      { status: 400 },
    );
  }

  const for_ = await tellAlt();

  try {
    await prisma.$transaction(async (tx) => {
      // Barn før foreldre, ellers stopper fremmednøklene slettingen.
      await tx.resultatIndividuell.deleteMany({});
      await tx.resultatLag.deleteMany({});
      await tx.lagMedlem.deleteMany({});
      await tx.lag.deleteMany({});
      await tx.ovelseFase.deleteMany({});
      await tx.turneringsKamp.deleteMany({});
      await tx.turneringsDeltager.deleteMany({});
      // Øvelser før turneringer: Ovelse.turneringId peker på Turnering.
      await tx.ovelse.deleteMany({});
      await tx.turnering.deleteMany({});
      await tx.user.deleteMany({});
      // Sesong røres ikke.
    });
  } catch (e) {
    return NextResponse.json({ ok: false, feil: String(e) }, { status: 500 });
  }

  const etter = await tellAlt();

  return NextResponse.json({ ok: true, for: for_, etter });
}
