"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finnBrukerVedNavn, normaliserNavn } from "@/lib/brukere";

async function krevBrukerId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");
  return session.user.id;
}

/**
 * Endrer navnet på den innloggede brukeren og friskner opp sesjonen.
 * Returnerer en feilkode i stedet for å redirecte, så navnet kan
 * auto-lagres fra klienten uten sidenavigasjon.
 */
export async function endreNavn(
  navn: string,
): Promise<{ feil: "kort" | "opptatt" | null }> {
  const userId = await krevBrukerId();
  const nyttNavn = normaliserNavn(navn);

  if (nyttNavn.length < 2) {
    return { feil: "kort" };
  }

  // Navnet er nøkkelen til kontoen — det kan ikke deles med en annen bruker.
  const finnes = await finnBrukerVedNavn(nyttNavn);
  if (finnes && finnes.id !== userId) {
    return { feil: "opptatt" };
  }

  await prisma.user.update({ where: { id: userId }, data: { navn: nyttNavn } });

  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
  revalidatePath("/ovelser");

  // Logg inn på nytt så sesjonen (og hilsenen) viser det nye navnet.
  await signIn("credentials", { navn: nyttNavn, redirect: false });
  return { feil: null };
}

/** Lagrer et profilbilde (data-URL) eller fjerner det når verdien er tom. */
export async function oppdaterBilde(bildeUrl: string | null) {
  const userId = await krevBrukerId();

  const verdi =
    bildeUrl && bildeUrl.startsWith("data:image/") ? bildeUrl : null;

  await prisma.user.update({
    where: { id: userId },
    data: { bildeUrl: verdi },
  });

  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
}
