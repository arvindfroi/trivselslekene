import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hentInnloggetBruker } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Onboarding from "@/components/Onboarding";

export default async function BliMedSide() {
  // Bare en bruker som fortsatt finnes i databasen sendes videre — ellers
  // ville en cookie fra en slettet konto sende deg i ring mellom /bli-med
  // og /dashboard i stedet for å la deg registrere deg på nytt.
  const innlogget = await hentInnloggetBruker();
  if (innlogget) redirect("/dashboard");

  const jar = await cookies();
  const navn = jar.get("onboarding_navn")?.value ?? "";
  let startFornavn = "";
  let startEtternavn = "";
  const navnedata = jar.get("onboarding_navnedata")?.value;
  if (navnedata) {
    try {
      const parsed = JSON.parse(navnedata) as {
        fornavn?: string;
        etternavn?: string;
      };
      startFornavn = parsed.fornavn ?? "";
      startEtternavn = parsed.etternavn ?? "";
    } catch {
      // ugyldig cookie — ignorer
    }
  }

  // Hent eksisterende brukere så nye kan velge deltagere til sin første lek
  const brukere = await prisma.user.findMany({
    select: { id: true, navn: true },
  });
  const alleDeltagere = brukere.map((b) => ({
    userId: b.id,
    navn: b.navn,
  }));

  return (
    <Onboarding
      key={navn || "ny"}
      startNavn={navn}
      startFornavn={startFornavn}
      startEtternavn={startEtternavn}
      alleDeltagere={alleDeltagere}
    />
  );
}
