"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { LagFormat, OvelseType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import {
  finnBrukerVedNavn,
  finnEllerOpprettBruker,
  normaliserNavn,
} from "@/lib/brukere";
import { sikreAktivSesong } from "@/lib/sesong";

const NAVN_COOKIE = "onboarding_navn";

/**
 * Steg 1 i onboardingen. Finnes navnet fra før: logg inn og send til dashbordet.
 * Er navnet nytt: lagre navnet i en cookie og last veiviseren videre. Alt går
 * via redirect (pålitelig), så vi slipper å lese en returverdi på klienten.
 */
export async function startOnboarding(formData: FormData) {
  const navn = normaliserNavn(String(formData.get("navn") ?? ""));
  if (navn.length < 2) redirect("/bli-med");

  const finnes = await finnBrukerVedNavn(navn);
  if (finnes) {
    await signIn("credentials", { navn, redirectTo: "/dashboard" });
    return;
  }

  const jar = await cookies();
  jar.set(NAVN_COOKIE, navn, { maxAge: 3600, path: "/", sameSite: "lax" });
  redirect("/bli-med");
}

export type OnboardingData = {
  navn: string;
  lekNavn: string;
  type: OvelseType;
  lagFormat: LagFormat | null;
  fellesLek: boolean;
  lokasjon: string;
  beskrivelse: string;
};

/** Siste steg: opprett bruker (om nødvendig) + øvelsen, og logg inn. */
export async function fullforOnboarding(data: OnboardingData) {
  const navn = normaliserNavn(data.navn);
  const lekNavn = data.lekNavn.trim();
  if (navn.length < 2 || lekNavn.length < 1) {
    return { feil: "Mangler navn eller lek-navn." };
  }

  const user = await finnEllerOpprettBruker(navn);
  if (!user) return { feil: "Kunne ikke opprette bruker." };

  const sesong = await sikreAktivSesong();
  (await cookies()).delete(NAVN_COOKIE);

  await prisma.ovelse.create({
    data: {
      navn: lekNavn,
      type: data.type,
      lagFormat: data.type === "LAG" ? data.lagFormat : null,
      fellesLek: data.fellesLek,
      lokasjon: data.lokasjon.trim() || null,
      beskrivelse: data.beskrivelse.trim() || null,
      sesongId: sesong.id,
      vertId: user.id,
    },
  });

  try {
    await signIn("credentials", { navn, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { feil: "Kunne ikke logge inn. Prøv igjen." };
    }
    throw error;
  }
}
