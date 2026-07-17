import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { tildelFarge } from "@/lib/farger";

/** Trimmer og komprimerer mellomrom, men beholder brukerens egen skrivemåte. */
export function normaliserNavn(navn: string): string {
  return navn.trim().replace(/\s+/g, " ");
}

const brukerNavnSchema = z.string().min(2, "Navn må være minst 2 tegn").max(100, "Navn kan maks være 100 tegn");

/** Finner en bruker på navn uten hensyn til store/små bokstaver. */
export async function finnBrukerVedNavn(raaNavn: string) {
  const navn = normaliserNavn(raaNavn);
  if (navn.length < 2) return null;

  return prisma.user.findFirst({
    where: { navn: { equals: navn, mode: "insensitive" } },
  });
}

/**
 * Finner en bruker basert på navn (kallenavn), eller oppretter en ny hvis
 * navnet ikke finnes fra før. Ingen passord – navnet (kallenavnet) er nøkkelen,
 * og huskes via en varig session. Ved oppretting kan for-/etternavn oppgis;
 * finnes brukeren fra før fylles disse inn dersom de mangler.
 */
export async function finnEllerOpprettBruker(
  raaNavn: string,
  ekstra?: { fornavn?: string | null; etternavn?: string | null },
) {
  const navn = normaliserNavn(raaNavn);

  const parsed = brukerNavnSchema.safeParse(navn);
  if (!parsed.success) return null;

  const fornavn = ekstra?.fornavn ? normaliserNavn(ekstra.fornavn) : null;
  const etternavn = ekstra?.etternavn ? normaliserNavn(ekstra.etternavn) : null;

  const eksisterende = await finnBrukerVedNavn(navn);
  if (eksisterende) {
    // Fyll inn manglende for-/etternavn hvis vi nettopp fikk dem oppgitt.
    if ((fornavn && !eksisterende.fornavn) || (etternavn && !eksisterende.etternavn)) {
      return prisma.user.update({
        where: { id: eksisterende.id },
        data: {
          fornavn: eksisterende.fornavn ?? fornavn,
          etternavn: eksisterende.etternavn ?? etternavn,
        },
      });
    }
    return eksisterende;
  }

  return prisma.user.create({
    data: { navn: parsed.data, fornavn, etternavn, farge: await tildelFarge() },
  });
}
