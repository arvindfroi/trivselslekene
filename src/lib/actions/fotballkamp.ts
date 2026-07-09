"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentStilling } from "@/lib/stilling";

export async function opprettFotballKamp(prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const navn = String(formData.get("navn") ?? "").trim();
  const lokasjon = String(formData.get("lokasjon") ?? "").trim();
  if (!navn) return { error: "Navn er påkrevd" };

  const sesong = await sikreAktivSesong();
  const stilling = await hentStilling(sesong.id);
  const topp9 = stilling.slice(0, 9);

  const lag4: string[] = [];
  const lag5: string[] = [];
  topp9.forEach((r, i) => {
    if (i % 2 === 0) lag4.push(r.userId);
    else lag5.push(r.userId);
  });

  await prisma.ovelse.create({
    data: {
      navn,
      lokasjon: lokasjon || null,
      type: "LAG",
      lagFormat: "FIRE_MOT_FEM",
      kvaliteter: ["LAGSPILL", "UTHOLDENHET", "TAKTIKK"],
      sesongId: sesong.id,
      vertId: session.user.id,
      lag: {
        create: [
          {
            navn: "Lag 1 (4)",
            medlemmer: { create: lag4.map((userId) => ({ userId })) },
          },
          {
            navn: "Lag 2 (5)",
            medlemmer: { create: lag5.map((userId) => ({ userId })) },
          },
        ],
      },
    },
  });

  revalidatePath("/fotball-kamp");
  return { success: true };
}

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
