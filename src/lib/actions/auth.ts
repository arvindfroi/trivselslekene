"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Kvalitet, LagFormat, OvelseType } from "@prisma/client";
import { signIn } from "@/lib/auth";
import {
  finnBrukerVedNavn,
  finnEllerOpprettBruker,
  normaliserNavn,
} from "@/lib/brukere";
import { sikreAktivSesong } from "@/lib/sesong";
import { opprettOvelseIDb } from "@/lib/actions/ovelser";
import { opprettTurneringData } from "@/lib/actions/turnering";
import { opprettLagkampData } from "@/lib/actions/fotballkamp";

const NAVN_COOKIE = "onboarding_navn";
const NAVNEDATA_COOKIE = "onboarding_navnedata";

/**
 * Steg 1 i onboardingen. Brukeren oppgir for-/etternavn og hva de vil bli kalt
 * (kallenavn). Kallenavnet er identiteten. Finnes kallenavnet fra før: logg inn
 * og send til dashbordet. Er det nytt: lagre navnene i en cookie og last
 * veiviseren videre. Alt går via redirect (pålitelig), så vi slipper å lese en
 * returverdi på klienten.
 */
export async function startOnboarding(formData: FormData) {
  const fornavn = normaliserNavn(String(formData.get("fornavn") ?? ""));
  const etternavn = normaliserNavn(String(formData.get("etternavn") ?? ""));
  // Kallenavn er valgfritt i skjemaet — faller tilbake til fornavnet.
  const kallenavn = normaliserNavn(String(formData.get("kallenavn") ?? "")) || fornavn;

  if (kallenavn.length < 2) redirect("/bli-med");

  const finnes = await finnBrukerVedNavn(kallenavn);
  if (finnes) {
    await signIn("credentials", { navn: kallenavn, redirectTo: "/dashboard" });
    return;
  }

  const jar = await cookies();
  jar.set(NAVN_COOKIE, kallenavn, { maxAge: 3600, path: "/", sameSite: "lax" });
  jar.set(NAVNEDATA_COOKIE, JSON.stringify({ fornavn, etternavn }), {
    maxAge: 3600,
    path: "/",
    sameSite: "lax",
  });
  redirect("/bli-med");
}

export type OnboardingData = {
  navn: string;
  fornavn?: string;
  etternavn?: string;
  opprettType: "ovelse" | "lagkamp" | "turnering";
  lekNavn: string;
  // Øvelse-felter
  type?: OvelseType;
  lagFormat?: LagFormat | null;
  kvaliteter?: Kvalitet[];
  fellesLek?: boolean;
  bildeUrl?: string | null;
  faser?: { tittel?: string; bildeUrl?: string | null }[];
  deltagere?: string[];
  // Felles
  lokasjon: string;
  beskrivelse: string;
  // Lagkamp
  antallLagkampDeltakere?: number;
  antallLag?: number;
  // Turnering
  antallTurneringDeltagere?: number;
  turneringSeeds?: { seed: number; userId: string }[];
};

/** Siste steg: opprett bruker (om nødvendig) + aktiviteten, og logg inn. */
export async function fullforOnboarding(data: OnboardingData) {
  const navn = normaliserNavn(data.navn);
  const lekNavn = data.lekNavn.trim();
  if (navn.length < 2 || lekNavn.length < 1) {
    return { feil: "Mangler navn eller lek-navn." };
  }

  const user = await finnEllerOpprettBruker(navn);
  if (!user) return { feil: "Kunne ikke opprette bruker." };

  const sesong = await sikreAktivSesong();
  const jar = await cookies();
  jar.delete(NAVN_COOKIE);
  jar.delete(NAVNEDATA_COOKIE);

  let redirectTo = "/dashboard";

  if (data.opprettType === "turnering") {
    const seeds = data.turneringSeeds ?? [];
    if (seeds.length < 3) return { feil: "Turnering må ha minst 3 deltagere." };

    const deltagerIder = seeds
      .sort((a, b) => a.seed - b.seed)
      .map((s) => s.userId);

    await opprettTurneringData({
      navn: lekNavn,
      sesongId: sesong.id,
      vertId: user.id,
      deltagerIder,
    });
    redirectTo = "/turnering";
  } else if (data.opprettType === "lagkamp") {
    const antallDeltakere = data.antallLagkampDeltakere ?? 4;
    const antallLag = data.antallLag ?? 2;

    const resultat = await opprettLagkampData({
      navn: lekNavn,
      lokasjon: data.lokasjon.trim() || null,
      antallDeltakere,
      antallLag,
      sesongId: sesong.id,
      vertId: user.id,
    });

    if ("error" in resultat) return { feil: resultat.error };
    redirectTo = `/ovelser/${resultat.ovelseId}`;
  } else {
    // Vanlig øvelse
    await opprettOvelseIDb({
      navn: lekNavn,
      type: data.type ?? "INDIVIDUELL",
      lagFormat: (data.type ?? "INDIVIDUELL") === "LAG" ? (data.lagFormat ?? null) : null,
      kvaliteter: data.kvaliteter ?? [],
      fellesLek: data.fellesLek ?? false,
      lokasjon: data.lokasjon.trim() || null,
      beskrivelse: data.beskrivelse.trim() || null,
      bildeUrl: data.bildeUrl ?? null,
      faser: data.faser ?? [],
      sesongId: sesong.id,
      vertId: user.id,
      deltagerIder: (data.type ?? "INDIVIDUELL") === "INDIVIDUELL"
        ? (data.deltagere ?? []).filter((id) => data.fellesLek || id !== user.id)
        : undefined,
    });
  }

  try {
    await signIn("credentials", { navn, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return { feil: "Kunne ikke logge inn. Prøv igjen." };
    }
    throw error;
  }
}
