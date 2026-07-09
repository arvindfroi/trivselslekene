"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentStilling } from "@/lib/stilling";
import type { LagFormat } from "@prisma/client";

type FormatDef = {
  teams: number;
  sizes: number[];
  label: string;
};

const FORMATER: Record<string, FormatDef> = {
  FIRE_MOT_FEM: { teams: 2, sizes: [4, 5], label: "4 mot 5" },
  TRE_MOT_TRE_MOT_TRE: { teams: 3, sizes: [3, 3, 3], label: "3 mot 3 mot 3" },
  TO_MOT_TO_MOT_TO_MOT_TO: { teams: 4, sizes: [2, 2, 2, 2], label: "2 mot 2 mot 2 mot 2" },
};

export async function opprettLagkamp(prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const navn = String(formData.get("navn") ?? "").trim();
  const lokasjon = String(formData.get("lokasjon") ?? "").trim();
  const formatKey = (formData.get("format") as string) || "FIRE_MOT_FEM";

  if (!navn) return { error: "Navn er påkrevd" };

  const fmt = FORMATER[formatKey];
  if (!fmt) return { error: "Ugyldig format" };

  const sesong = await sikreAktivSesong();
  const stilling = await hentStilling(sesong.id);
  const totalSpillere = fmt.sizes.reduce((a, b) => a + b, 0);
  const topp = stilling.slice(0, totalSpillere);

  // Snake draft: fordel spillere på lag
  const lagenesMedlemmer: string[][] = fmt.sizes.map(() => []);
  topp.forEach((r, i) => {
    lagenesMedlemmer[i % fmt.teams].push(r.userId);
  });

  await prisma.ovelse.create({
    data: {
      navn,
      lokasjon: lokasjon || null,
      type: "LAG",
      lagFormat: formatKey as LagFormat,
      kvaliteter: ["LAGSPILL", "UTHOLDENHET", "TAKTIKK"],
      sesongId: sesong.id,
      vertId: session.user.id,
      lag: {
        create: lagenesMedlemmer.map((medlemmer, i) => ({
          navn: `Lag ${i + 1} (${fmt.sizes[i]})`,
          medlemmer: { create: medlemmer.map((userId) => ({ userId })) },
        })),
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
