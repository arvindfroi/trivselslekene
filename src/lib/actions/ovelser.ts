"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import type { LagFormat, OvelseStatus, OvelseType } from "@prisma/client";

async function krevInnloggetBruker() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/bli-med");
  }
  return session.user;
}

export async function opprettOvelse(formData: FormData) {
  const bruker = await krevInnloggetBruker();

  const navn = String(formData.get("navn") ?? "").trim();
  const beskrivelse = String(formData.get("beskrivelse") ?? "").trim();
  const lokasjon = String(formData.get("lokasjon") ?? "").trim();
  const type = formData.get("type") as OvelseType;
  const lagFormat = formData.get("lagFormat") as LagFormat | null;
  const fellesLek = formData.get("fellesLek") === "on";

  if (!navn) return;

  const sesong = await sikreAktivSesong();

  const ovelse = await prisma.ovelse.create({
    data: {
      navn,
      beskrivelse: beskrivelse || null,
      lokasjon: lokasjon || null,
      type,
      lagFormat: type === "LAG" ? lagFormat : null,
      fellesLek,
      sesongId: sesong.id,
      vertId: bruker.id,
    },
  });

  revalidatePath("/ovelser");
  revalidatePath("/profil");
  redirect(`/ovelser/${ovelse.id}`);
}

export async function slettOvelse(ovelseId: string) {
  const bruker = await krevInnloggetBruker();
  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId },
    select: { vertId: true },
  });
  // Kun verten kan slette sin egen øvelse.
  if (!ovelse || ovelse.vertId !== bruker.id) {
    redirect("/profil");
  }
  await prisma.ovelse.delete({ where: { id: ovelseId } });
  revalidatePath("/ovelser");
  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
  redirect("/profil");
}

export async function settOvelseStatus(ovelseId: string, status: OvelseStatus) {
  await krevInnloggetBruker();
  await prisma.ovelse.update({ where: { id: ovelseId }, data: { status } });
  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/ovelser");
}

export async function opprettLag(ovelseId: string, formData: FormData) {
  await krevInnloggetBruker();
  const navn = String(formData.get("navn") ?? "").trim();
  if (!navn) return;

  await prisma.lag.create({
    data: { navn, ovelseId },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
}

export async function leggTilLagmedlem(
  ovelseId: string,
  lagId: string,
  formData: FormData
) {
  await krevInnloggetBruker();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await prisma.lagMedlem.upsert({
    where: { lagId_userId: { lagId, userId } },
    create: { lagId, userId },
    update: {},
  });

  revalidatePath(`/ovelser/${ovelseId}`);
}

export async function fjernLagmedlem(ovelseId: string, lagmedlemId: string) {
  await krevInnloggetBruker();
  await prisma.lagMedlem.delete({ where: { id: lagmedlemId } });
  revalidatePath(`/ovelser/${ovelseId}`);
}

export async function lagreResultatIndividuell(
  ovelseId: string,
  formData: FormData
) {
  await krevInnloggetBruker();
  const userId = String(formData.get("userId") ?? "");
  const plasseringRaw = formData.get("plassering");
  const poengRaw = formData.get("poeng");

  if (!userId || poengRaw === null || poengRaw === "") return;

  const plassering = plasseringRaw ? Number(plasseringRaw) : null;
  const poeng = Number(poengRaw);
  if (Number.isNaN(poeng)) return;

  await prisma.resultatIndividuell.upsert({
    where: { ovelseId_userId: { ovelseId, userId } },
    create: { ovelseId, userId, plassering, poeng },
    update: { plassering, poeng },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/dashboard");
}

export async function lagreResultatLag(
  ovelseId: string,
  lagId: string,
  formData: FormData
) {
  await krevInnloggetBruker();
  const plasseringRaw = formData.get("plassering");
  const poengRaw = formData.get("poeng");

  if (poengRaw === null || poengRaw === "") return;

  const plassering = plasseringRaw ? Number(plasseringRaw) : null;
  const poeng = Number(poengRaw);
  if (Number.isNaN(poeng)) return;

  await prisma.resultatLag.upsert({
    where: { ovelseId_lagId: { ovelseId, lagId } },
    create: { ovelseId, lagId, plassering, poeng },
    update: { plassering, poeng },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/dashboard");
}
