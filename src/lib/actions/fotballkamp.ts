"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function registrerVinner(
  ovelseId: string,
  vinnerLagId: string,
  poengPerSpiller: number,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId },
    select: { vertId: true, lag: { include: { medlemmer: true } } },
  });
  if (!ovelse || ovelse.vertId !== session.user.id) redirect("/fotball-kamp");

  for (const lag of ovelse.lag) {
    await prisma.resultatLag.upsert({
      where: { ovelseId_lagId: { ovelseId, lagId: lag.id } },
      create: {
        ovelseId,
        lagId: lag.id,
        plassering: lag.id === vinnerLagId ? 1 : 2,
        poeng: lag.id === vinnerLagId ? poengPerSpiller : 0,
      },
      update: {
        plassering: lag.id === vinnerLagId ? 1 : 2,
        poeng: lag.id === vinnerLagId ? poengPerSpiller : 0,
      },
    });
  }

  await prisma.ovelse.update({
    where: { id: ovelseId },
    data: { status: "FULLFORT" },
  });

  revalidatePath("/fotball-kamp");
  revalidatePath("/stilling");
  revalidatePath("/dashboard");
}

export async function slettFotballKamp(ovelseId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId },
    select: { vertId: true },
  });
  if (!ovelse || ovelse.vertId !== session.user.id) redirect("/fotball-kamp");

  await prisma.ovelse.delete({ where: { id: ovelseId } });

  revalidatePath("/fotball-kamp");
  revalidatePath("/stilling");
  revalidatePath("/dashboard");
}
