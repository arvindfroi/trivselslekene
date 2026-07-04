"use server";

import { AuthError } from "next-auth";
import type { LagFormat, OvelseType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import {
  finnBrukerVedNavn,
  finnEllerOpprettBruker,
  normaliserNavn,
} from "@/lib/brukere";
import { sikreAktivSesong } from "@/lib/sesong";

export type NavnResultat =
  | { feil: string }
  | { status: "ny"; navn: string }
  | undefined;

/**
 * Steg 1 i onboardingen. Finnes navnet fra før: logg inn og send til dashbordet.
 * Er navnet nytt: gi klienten beskjed slik at veiviseren kan fortsette.
 */
export async function sjekkNavn(
  _forrige: NavnResultat,
  formData: FormData
): Promise<NavnResultat> {
  const navn = normaliserNavn(String(formData.get("navn") ?? ""));
  if (navn.length < 2) {
    return { feil: "Skriv inn navnet ditt (minst 2 tegn)." };
  }

  const finnes = await finnBrukerVedNavn(navn);

  if (finnes) {
    await signIn("credentials", { navn, redirectTo: "/dashboard" });
    // signIn kaster en redirect ved suksess – koden under nås ikke.
    return undefined;
  }

  return { status: "ny", navn };
}

export type OnboardingData = {
  navn: string;
  lekNavn: string;
  type: OvelseType;
  lagFormat: LagFormat | null;
  vertDeltar: boolean;
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

  await prisma.ovelse.create({
    data: {
      navn: lekNavn,
      type: data.type,
      lagFormat: data.type === "LAG" ? data.lagFormat : null,
      vertDeltar: data.vertDeltar,
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
