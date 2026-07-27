import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_KEY = "slett-test-sesong-2026-midlg";

export async function POST(req: NextRequest) {
  const { key, aar } = await req.json();

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, feil: "Ugyldig admin-nøkkel." }, { status: 403 });
  }

  if (!aar || aar < 2020 || aar > 2100) {
    return NextResponse.json({ ok: false, feil: "Ugyldig år." }, { status: 400 });
  }

  const sesong = await prisma.sesong.findUnique({ where: { aar } });
  if (!sesong) {
    return NextResponse.json({ ok: false, feil: `Sesong ${aar} finnes ikke.` });
  }

  try {
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

    return NextResponse.json({ ok: true, navn: sesong.navn });
  } catch (e) {
    return NextResponse.json({ ok: false, feil: String(e) }, { status: 500 });
  }
}
