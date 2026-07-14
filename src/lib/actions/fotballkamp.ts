"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentAlleSesongData, hentStilling } from "@/lib/stilling";

export type OpprettLagkampInput = {
  navn: string;
  lokasjon: string | null;
  antallDeltakere: number;
  antallLag: number;
  sesongId: string;
  vertId: string;
};

/** Oppretter lagkamp med snake draft. Brukes både av server-action og av
 *  fullforOnboarding. Returnerer ovelseId. */
export async function opprettLagkampData(input: OpprettLagkampInput) {
  const { navn, lokasjon, antallDeltakere, antallLag, sesongId, vertId } = input;

  const sesongData = await hentAlleSesongData(sesongId);
  const stilling = hentStilling(sesongData);
  const topp = stilling.slice(0, antallDeltakere);

  if (topp.length < antallDeltakere) {
    return { error: `Trenger ${antallDeltakere} deltakere, men bare ${topp.length} er tilgjengelige` };
  }

  // Fordel spillere jevnt på lag
  const base = Math.floor(antallDeltakere / antallLag);
  const rest = antallDeltakere % antallLag;
  const lagStorrelser = Array.from({ length: antallLag }, (_, i) =>
    i < rest ? base + 1 : base,
  );

  // Snake draft: fordel jevnt slik at Lag 1 ikke får alle beste spillerne
  const lagenesMedlemmer: string[][] = lagStorrelser.map(() => []);
  topp.forEach((r, i) => {
    const runde = Math.floor(i / antallLag);
    const pos = i % antallLag;
    const lagIndex = runde % 2 === 0 ? pos : antallLag - 1 - pos;
    lagenesMedlemmer[lagIndex].push(r.userId);
  });

  const ovelse = await prisma.ovelse.create({
    data: {
      navn,
      lokasjon: lokasjon || null,
      type: "LAG",
      lagFormat: "ANNET",
      kvaliteter: ["LAGSPILL", "UTHOLDENHET", "TAKTIKK"],
      sesongId,
      vertId,
      lag: {
        create: lagenesMedlemmer.map((medlemmer, i) => ({
          navn: `Lag ${i + 1}`,
          medlemmer: { create: medlemmer.map((userId) => ({ userId })) },
        })),
      },
    },
  });

  return { success: true, ovelseId: ovelse.id };
}

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

  const resultat = await opprettLagkampData({
    navn,
    lokasjon: lokasjon || null,
    antallDeltakere,
    antallLag,
    sesongId: sesong.id,
    vertId: session.user.id,
  });

  if ("error" in resultat) return resultat;

  revalidatePath("/fotball-kamp");
  revalidatePath("/profil");
  revalidatePath("/ovelser");
  return { success: true, ovelseId: resultat.ovelseId };
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
