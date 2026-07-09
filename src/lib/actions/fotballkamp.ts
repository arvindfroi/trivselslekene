"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentStilling } from "@/lib/stilling";

export async function opprettLagkamp(prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const navn = String(formData.get("navn") ?? "").trim();
  const lokasjon = String(formData.get("lokasjon") ?? "").trim();
  const antallDeltakere = parseInt(String(formData.get("antallDeltakere") ?? "0"));
  const antallLag = parseInt(String(formData.get("antallLag") ?? "0"));

  if (!navn) return { error: "Navn er påkrevd" };
  if (!antallDeltakere || antallDeltakere < 2) return { error: "Minst 2 deltakere" };
  if (!antallLag || antallLag < 2) return { error: "Minst 2 lag" };
  if (antallLag > antallDeltakere) return { error: "Flere lag enn deltakere" };

  const sesong = await sikreAktivSesong();
  const stilling = await hentStilling(sesong.id);
  const topp = stilling.slice(0, antallDeltakere);

  // Fordel spillere jevnt på lag: base = floor(deltakere / lag), resten får +1
  const base = Math.floor(antallDeltakere / antallLag);
  const rest = antallDeltakere % antallLag;
  const lagStorrelser = Array.from({ length: antallLag }, (_, i) =>
    i < rest ? base + 1 : base,
  );

  // Snake draft
  const lagenesMedlemmer: string[][] = lagStorrelser.map(() => []);
  topp.forEach((r, i) => {
    lagenesMedlemmer[i % antallLag].push(r.userId);
  });

  await prisma.ovelse.create({
    data: {
      navn,
      lokasjon: lokasjon || null,
      type: "LAG",
      lagFormat: "ANNET",
      kvaliteter: ["LAGSPILL", "UTHOLDENHET", "TAKTIKK"],
      sesongId: sesong.id,
      vertId: session.user.id,
      lag: {
        create: lagenesMedlemmer.map((medlemmer, i) => ({
          navn: `Lag ${i + 1}`,
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
