"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finnBrukerVedNavn, normaliserNavn } from "@/lib/brukere";
import { lastOppBilde, slettFraBlob } from "@/lib/blob";

async function krevBrukerId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");
  return session.user.id;
}

/** Endrer navnet på den innloggede brukeren og friskner opp sesjonen. */
export async function endreNavn(formData: FormData) {
  const userId = await krevBrukerId();
  const nyttNavn = normaliserNavn(String(formData.get("navn") ?? ""));

  if (nyttNavn.length < 2) {
    redirect("/profil?navnfeil=kort");
  }

  // Navnet er nøkkelen til kontoen — det kan ikke deles med en annen bruker.
  const finnes = await finnBrukerVedNavn(nyttNavn);
  if (finnes && finnes.id !== userId) {
    redirect("/profil?navnfeil=opptatt");
  }

  await prisma.user.update({ where: { id: userId }, data: { navn: nyttNavn } });

  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
  revalidatePath("/ovelser");

  // Logg inn på nytt så sesjonen (og hilsenen) viser det nye navnet.
  await signIn("credentials", { navn: nyttNavn, redirectTo: "/profil" });
}

/** Lagrer et profilbilde via Vercel Blob, eller fjerner det når verdien er tom. */
export async function oppdaterBilde(dataUrl: string | null) {
  const userId = await krevBrukerId();

  // Hent nåværende bilde for å kunne slette det fra Blob
  const eksisterende = await prisma.user.findUnique({
    where: { id: userId },
    select: { bildeUrl: true },
  });

  let nyUrl: string | null = null;
  if (dataUrl && dataUrl.startsWith("data:image/")) {
    nyUrl = await lastOppBilde(dataUrl, `brukere/${userId}`);
    if (!nyUrl) return; // opplasting feilet
  }

  await prisma.user.update({
    where: { id: userId },
    data: { bildeUrl: nyUrl },
  });

  // Slett det gamle bildet fra Blob (best-effort)
  if (eksisterende?.bildeUrl) await slettFraBlob(eksisterende.bildeUrl);

  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
}
