"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import type { Kvalitet, LagFormat, OvelseStatus, OvelseType } from "@prisma/client";
import { ALLE_KVALITETER } from "@/lib/ovelseLabels";
import { opprettLagkamp } from "@/lib/actions/fotballkamp";
import { opprettTurnering } from "@/lib/actions/turnering";

// ─── Zod-skjemaer ──────────────────────────────────────────────────────────

const ovelseInputSchema = z.object({
  navn: z.string().min(1, "Navn er påkrevd").max(100, "Navn kan maks være 100 tegn"),
  lokasjon: z.string().max(100, "Lokasjon kan maks være 100 tegn").optional(),
  beskrivelse: z.string().max(500, "Beskrivelse kan maks være 500 tegn").optional(),
});

const faseSchema = z.object({
  tittel: z.string().max(100).optional(),
  bildeUrl: z.string().optional(),
});

const faserSchema = z.array(faseSchema).max(20, "Maks 20 faser");

// ─── Auth-hjelpere ────────────────────────────────────────────────────────

async function krevInnloggetBruker() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/bli-med");
  }
  return session.user;
}

/** Sjekker at innlogget bruker er vert for øvelsen. Redirecter ellers. */
async function krevVert(ovelseId: string) {
  const bruker = await krevInnloggetBruker();
  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId },
    select: { vertId: true },
  });
  if (!ovelse || ovelse.vertId !== bruker.id) {
    redirect(`/ovelser/${ovelseId}`);
  }
  return bruker;
}

// ─── Server actions ───────────────────────────────────────────────────────

export async function opprettOvelse(
  prev: unknown,
  formData: FormData,
) {
  const bruker = await krevInnloggetBruker();
  const sesong = await sikreAktivSesong();

  const opprettType = String(formData.get("opprettType") ?? "ovelse");

  // ─── Turnering ────────────────────────────────────────────────
  if (opprettType === "turnering") {
    // Delegér til turnering.ts — den håndterer alt inkludert redirect
    return opprettTurnering(formData);
  }

  // ─── Lagkamp ──────────────────────────────────────────────────
  if (opprettType === "lagkamp") {
    const resultat = await opprettLagkamp(prev, formData);
    if ("error" in resultat && resultat.error) {
      return resultat;
    }
    if ("ovelseId" in resultat && resultat.ovelseId) {
      redirect(`/ovelser/${resultat.ovelseId}`);
    }
    return { error: "Ukjent feil ved opprettelse av lagkamp" };
  }

  // ─── Vanlig øvelse ────────────────────────────────────────────
  const navn = String(formData.get("navn") ?? "").trim();
  const lokasjonRaw = String(formData.get("lokasjon") ?? "").trim();
  const beskrivelseRaw = String(formData.get("beskrivelse") ?? "").trim();

  // Zod-validering
  const parsed = ovelseInputSchema.safeParse({
    navn,
    lokasjon: lokasjonRaw || undefined,
    beskrivelse: beskrivelseRaw || undefined,
  });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError?.message ?? "Ugyldig input" };
  }

  const { lokasjon, beskrivelse } = parsed.data;
  const type = formData.get("type") as OvelseType;
  const lagFormat = formData.get("lagFormat") as LagFormat | null;
  const fellesLek = formData.get("fellesLek") === "on";
  const bildeUrl = String(formData.get("bildeUrl") ?? "").trim() || null;
  const kvaliteter = formData
    .getAll("kvaliteter")
    .map(String)
    .filter((k): k is Kvalitet => (ALLE_KVALITETER as string[]).includes(k));

  // ─── Les faser fra skjult JSON-felt ─────────────────────────────
  let faser: { tittel?: string; bildeUrl?: string }[] = [];
  const faserRaw = String(formData.get("faser") ?? "").trim();
  if (faserRaw) {
    try {
      const parsedFaser = faserSchema.safeParse(JSON.parse(faserRaw));
      if (parsedFaser.success) {
        faser = parsedFaser.data.filter((f) => f.bildeUrl); // kun faser med bilde
      }
    } catch {
      // ugyldig JSON — ignorer
    }
  }

  const ovelse = await prisma.ovelse.create({
    data: {
      navn: parsed.data.navn,
      beskrivelse: beskrivelse || null,
      lokasjon: lokasjon || null,
      type,
      lagFormat: type === "LAG" ? lagFormat : null,
      kvaliteter,
      fellesLek,
      bildeUrl: bildeUrl?.startsWith("data:image/") ? bildeUrl : null,
      sesongId: sesong.id,
      vertId: bruker.id,
      faser: faser.length > 0
        ? {
            create: faser.map((f, i) => ({
              rekkefolge: i + 1,
              tittel: f.tittel?.trim() || null,
              bildeUrl: f.bildeUrl?.startsWith("data:image/") ? f.bildeUrl : null,
            })),
          }
        : undefined,
    },
  });

  revalidatePath("/ovelser");
  revalidatePath("/profil");
  redirect(`/ovelser/${ovelse.id}`);
}

export async function slettOvelse(ovelseId: string) {
  const bruker = await krevInnloggetBruker();
  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId },
    select: { vertId: true },
  });
  // Kun verten kan slette sin egen øvelse.
  if (!ovelse || ovelse.vertId !== bruker.id) {
    redirect("/profil");
  }
  await prisma.ovelse.delete({ where: { id: ovelseId } });
  revalidatePath("/ovelser");
  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
  redirect("/profil");
}

export async function settOvelseStatus(ovelseId: string, status: OvelseStatus) {
  await krevVert(ovelseId);
  await prisma.ovelse.update({ where: { id: ovelseId }, data: { status } });
  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/ovelser");
}

export async function settAktivFase(ovelseId: string, fase: number) {
  const bruker = await krevInnloggetBruker();
  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId },
    select: { vertId: true, faser: { select: { rekkefolge: true } } },
  });
  if (!ovelse || ovelse.vertId !== bruker.id) {
    redirect(`/ovelser/${ovelseId}`);
  }
  const maksFase = ovelse.faser.length;
  if (fase < 0 || fase > maksFase) return; // 0 = skjul faser, 1..maksFase = vis fase
  await prisma.ovelse.update({ where: { id: ovelseId }, data: { aktivFase: fase } });
  revalidatePath(`/ovelser/${ovelseId}`);
}

export async function opprettLag(ovelseId: string, formData: FormData) {
  await krevVert(ovelseId);
  const navn = String(formData.get("navn") ?? "").trim();
  if (!navn) return;

  await prisma.lag.create({
    data: { navn, ovelseId },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
}

export async function leggTilLagmedlem(
  ovelseId: string,
  lagId: string,
  formData: FormData
) {
  await krevVert(ovelseId);
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await prisma.lagMedlem.upsert({
    where: { lagId_userId: { lagId, userId } },
    create: { lagId, userId },
    update: {},
  });

  revalidatePath(`/ovelser/${ovelseId}`);
}

export async function fjernLagmedlem(ovelseId: string, lagmedlemId: string) {
  await krevVert(ovelseId);
  await prisma.lagMedlem.delete({ where: { id: lagmedlemId } });
  revalidatePath(`/ovelser/${ovelseId}`);
}

export async function lagreResultatIndividuell(
  ovelseId: string,
  formData: FormData
) {
  await krevVert(ovelseId);
  const userId = String(formData.get("userId") ?? "");
  const plasseringRaw = formData.get("plassering");
  const poengRaw = formData.get("poeng");

  if (!userId || poengRaw === null || poengRaw === "") return;

  const plassering = plasseringRaw ? Number(plasseringRaw) : null;
  const poeng = Number(poengRaw);
  if (Number.isNaN(poeng)) return;

  await prisma.resultatIndividuell.upsert({
    where: { ovelseId_userId: { ovelseId, userId } },
    create: { ovelseId, userId, plassering, poeng },
    update: { plassering, poeng },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/dashboard");
}

export async function lagreResultatLag(
  ovelseId: string,
  lagId: string,
  formData: FormData
) {
  await krevVert(ovelseId);
  const plasseringRaw = formData.get("plassering");
  const poengRaw = formData.get("poeng");

  if (poengRaw === null || poengRaw === "") return;

  const plassering = plasseringRaw ? Number(plasseringRaw) : null;
  const poeng = Number(poengRaw);
  if (Number.isNaN(poeng)) return;

  await prisma.resultatLag.upsert({
    where: { ovelseId_lagId: { ovelseId, lagId } },
    create: { ovelseId, lagId, plassering, poeng },
    update: { plassering, poeng },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/dashboard");
}
