"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

const registrerSchema = z.object({
  navn: z.string().min(2, "Navnet må ha minst 2 tegn"),
  epost: z.string().email("Ugyldig e-postadresse"),
  passord: z.string().min(8, "Passordet må ha minst 8 tegn"),
});

export type SkjemaResultat = { feil?: string } | undefined;

export async function registrerBruker(
  _forrige: SkjemaResultat,
  formData: FormData
): Promise<SkjemaResultat> {
  const parsed = registrerSchema.safeParse({
    navn: formData.get("navn"),
    epost: formData.get("epost"),
    passord: formData.get("passord"),
  });

  if (!parsed.success) {
    return { feil: parsed.error.issues[0]?.message ?? "Ugyldig skjema" };
  }

  const { navn, epost, passord } = parsed.data;

  const finnesFra = await prisma.user.findUnique({ where: { epost } });
  if (finnesFra) {
    return { feil: "Det finnes allerede en bruker med denne e-postadressen" };
  }

  const passordHash = await bcrypt.hash(passord, 10);

  await prisma.user.create({
    data: { navn, epost, passordHash },
  });

  try {
    await signIn("credentials", {
      epost,
      passord,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { feil: "Kunne ikke logge inn automatisk. Prøv å logge inn manuelt." };
    }
    throw error;
  }
}

export async function loggInnBruker(
  _forrige: SkjemaResultat,
  formData: FormData
): Promise<SkjemaResultat> {
  const epost = formData.get("epost");
  const passord = formData.get("passord");

  try {
    await signIn("credentials", {
      epost,
      passord,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { feil: "Feil e-post eller passord" };
    }
    throw error;
  }
}
