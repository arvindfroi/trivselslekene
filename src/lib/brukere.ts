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
 * Finner en bruker basert på navn, eller oppretter en ny hvis navnet ikke
 * finnes fra før. Ingen passord – navnet er nøkkelen, og huskes via en varig
 * session.
 */
export async function finnEllerOpprettBruker(raaNavn: string) {
  const navn = normaliserNavn(raaNavn);

  const parsed = brukerNavnSchema.safeParse(navn);
  if (!parsed.success) return null;

  const eksisterende = await finnBrukerVedNavn(navn);
  if (eksisterende) return eksisterende;

  return prisma.user.create({ data: { navn: parsed.data, farge: await tildelFarge() } });
}
