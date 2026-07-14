import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Onboarding from "@/components/Onboarding";

export default async function BliMedSide() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const navn = (await cookies()).get("onboarding_navn")?.value ?? "";

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
      alleDeltagere={alleDeltagere}
    />
  );
}
