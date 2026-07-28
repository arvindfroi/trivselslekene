import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_KEY = "slett-alt-2026-midlg";

export async function POST(req: NextRequest) {
  const { key } = await req.json();

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, feil: "Ugyldig admin-nøkkel." }, { status: 403 });
  }

  try {
    // Finn alle sesonger og slett alt i FK-rekkefølge
    const sesonger = await prisma.sesong.findMany();

    for (const sesong of sesonger) {
      await prisma.$transaction(async (tx) => {
        await tx.resultatIndividuell.deleteMany({ where: { ovelse: { sesongId: sesong.id } } });
        await tx.resultatLag.deleteMany({ where: { ovelse: { sesongId: sesong.id } } });
        await tx.lagMedlem.deleteMany({ where: { lag: { ovelse: { sesongId: sesong.id } } } });
        await tx.lag.deleteMany({ where: { ovelse: { sesongId: sesong.id } } });
        await tx.ovelseFase.deleteMany({ where: { ovelse: { sesongId: sesong.id } } });
        await tx.turneringsKamp.deleteMany({ where: { turnering: { sesongId: sesong.id } } });
        await tx.turneringsDeltager.deleteMany({ where: { turnering: { sesongId: sesong.id } } });
        await tx.ovelse.deleteMany({ where: { sesongId: sesong.id } });
        await tx.turnering.deleteMany({ where: { sesongId: sesong.id } });
        await tx.sesong.delete({ where: { id: sesong.id } });
      });
    }

    const brukere = await prisma.user.deleteMany();

    return NextResponse.json({
      ok: true,
      slettetSesonger: sesonger.map((s) => s.navn),
      slettetBrukere: brukere.count,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, feil: String(e) }, { status: 500 });
  }
}
