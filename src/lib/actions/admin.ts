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
