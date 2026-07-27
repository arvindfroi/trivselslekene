"use server";

import { prisma } from "@/lib/prisma";
import { krevInnloggetBruker } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function opprettSesong(formData: FormData) {
  await krevInnloggetBruker();
  const aar = parseInt(formData.get("aar") as string);
  if (!aar || aar < 2020 || aar > 2100) return;

  const eksisterende = await prisma.sesong.findUnique({ where: { aar } });
  if (eksisterende) return;

  await prisma.sesong.create({
    data: { aar, navn: `Trivselslekene ${aar}`, aktiv: false },
  });

  revalidatePath("/admin");
}

export async function settAktivSesong(formData: FormData) {
  await krevInnloggetBruker();
  const sesongId = formData.get("sesongId") as string;
  if (!sesongId) return;

  await prisma.sesong.updateMany({ data: { aktiv: false } });
  await prisma.sesong.update({ where: { id: sesongId }, data: { aktiv: true } });

  revalidatePath("/admin");
}

export async function slettSesong(aar: number) {
  await krevInnloggetBruker();

  const sesong = await prisma.sesong.findUnique({ where: { aar } });
  if (!sesong) return { ok: false, feil: `Sesong ${aar} finnes ikke.` };

  // Slett i FK-rekkefølge for å unngå constraint-feil
  await prisma.$transaction(async (tx) => {
    // 1. Resultater (individuelle + lag) for øvelser i sesongen
    await tx.resultatIndividuell.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });
    await tx.resultatLag.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });

    // 2. LagMedlemmer for lag i sesongens øvelser
    await tx.lagMedlem.deleteMany({
      where: { lag: { ovelse: { sesongId: sesong.id } } },
    });

    // 3. Lag i sesongens øvelser
    await tx.lag.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });

    // 4. Faser i sesongens øvelser
    await tx.ovelseFase.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });

    // 5. Turneringskamper
    await tx.turneringsKamp.deleteMany({
      where: { turnering: { sesongId: sesong.id } },
    });

    // 6. Turneringsdeltagere
    await tx.turneringsDeltager.deleteMany({
      where: { turnering: { sesongId: sesong.id } },
    });

    // 7. Øvelser i sesongen (inkl. de som er knyttet til turneringer)
    await tx.ovelse.deleteMany({
      where: { sesongId: sesong.id },
    });

    // 8. Turneringer i sesongen
    await tx.turnering.deleteMany({
      where: { sesongId: sesong.id },
    });

    // 9. Selve sesongen
    await tx.sesong.delete({ where: { id: sesong.id } });
  });

  revalidatePath("/admin");
  revalidatePath("/stilling");
  revalidatePath("/ovelser");

  return { ok: true, navn: sesong.navn };
}
