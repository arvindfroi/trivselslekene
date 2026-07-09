"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentStilling } from "@/lib/stilling";
import type { Kvalitet, LagFormat, OvelseStatus, OvelseType } from "@prisma/client";
import { ALLE_KVALITETER } from "@/lib/ovelseLabels";

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

export async function opprettOvelse(
  prev: unknown,
  formData: FormData,
) {
  const bruker = await krevInnloggetBruker();
  const sesong = await sikreAktivSesong();
  const navn = String(formData.get("navn") ?? "").trim();
  if (!navn) return { error: "Navn er påkrevd" };

  const opprettType = String(formData.get("opprettType") ?? "ovelse");
  const lokasjon = String(formData.get("lokasjon") ?? "").trim();

  // ─── Turnering ────────────────────────────────────────────────
  if (opprettType === "turnering") {
    const deltagerIder: string[] = [];
    for (let i = 1; i <= 8; i++) {
      const id = String(formData.get(`seed${i}`) ?? "").trim();
      if (!id || deltagerIder.includes(id)) continue;
      deltagerIder.push(id);
    }
    if (deltagerIder.length !== 8) return { error: "Velg 8 ulike deltagere" };

    const slots = bracketSlots();

    await prisma.turnering.create({
      data: {
        navn,
        sesongId: sesong.id,
        status: "PLANLAGT",
        deltagere: {
          create: deltagerIder.map((userId, i) => ({
            userId,
            seed: i + 1,
          })),
        },
        kamper: {
          create: slots.map((s) => ({
            bracket: s.bracket,
            runde: s.runde,
            posisjon: s.posisjon,
            status: "VENTER",
          })),
        },
      },
    });

    // Plasser seeds i WR1
    const turnering = await prisma.turnering.findFirst({
      where: { sesongId: sesong.id, navn },
      include: { deltagere: true, kamper: true },
      orderBy: { createdAt: "desc" },
    });
    if (turnering) {
      const deltagerMap = new Map(turnering.deltagere.map((d) => [d.seed, d.id]));
      const wr1Par: [number, number, number][] = [
        [1, 8, 1], [4, 5, 2], [3, 6, 3], [2, 7, 4],
      ];
      for (const [s1, s2, pos] of wr1Par) {
        const d1 = deltagerMap.get(s1);
        const d2 = deltagerMap.get(s2);
        if (!d1 || !d2) continue;
        const kamp = turnering.kamper.find(
          (k) => k.bracket === "W" && k.runde === 1 && k.posisjon === pos,
        );
        if (!kamp) continue;
        await prisma.turneringsKamp.update({
          where: { id: kamp.id },
          data: { deltager1Id: d1, deltager2Id: d2, status: "KLAR" },
        });
      }
    }

    revalidatePath("/turnering");
    revalidatePath("/profil");
    redirect("/turnering");
  }

  // ─── Lagkamp ──────────────────────────────────────────────────
  if (opprettType === "lagkamp") {
    const antallDeltakere = parseInt(String(formData.get("antallDeltakere") ?? "0"));
    const antallLag = parseInt(String(formData.get("antallLag") ?? "0"));

    if (!antallDeltakere || antallDeltakere < 2) return { error: "Minst 2 deltakere" };
    if (!antallLag || antallLag < 2) return { error: "Minst 2 lag" };
    if (antallLag > antallDeltakere) return { error: "Flere lag enn deltakere" };

    const stilling = await hentStilling(sesong.id);
    const topp = stilling.slice(0, antallDeltakere);

    const base = Math.floor(antallDeltakere / antallLag);
    const rest = antallDeltakere % antallLag;
    const lagStorrelser = Array.from({ length: antallLag }, (_, i) =>
      i < rest ? base + 1 : base,
    );

    const lagenesMedlemmer: string[][] = lagStorrelser.map(() => []);
    topp.forEach((r, i) => {
      lagenesMedlemmer[i % antallLag].push(r.userId);
    });

    const ovelse = await prisma.ovelse.create({
      data: {
        navn,
        lokasjon: lokasjon || null,
        type: "LAG",
        lagFormat: "ANNET",
        kvaliteter: ["LAGSPILL", "UTHOLDENHET", "TAKTIKK"],
        sesongId: sesong.id,
        vertId: bruker.id,
        lag: {
          create: lagenesMedlemmer.map((medlemmer, i) => ({
            navn: `Lag ${i + 1}`,
            medlemmer: { create: medlemmer.map((userId) => ({ userId })) },
          })),
        },
      },
    });

    revalidatePath("/fotball-kamp");
    revalidatePath("/profil");
    revalidatePath("/ovelser");
    redirect(`/ovelser/${ovelse.id}`);
  }

  // ─── Vanlig øvelse ────────────────────────────────────────────
  const beskrivelse = String(formData.get("beskrivelse") ?? "").trim();
  const type = formData.get("type") as OvelseType;
  const lagFormat = formData.get("lagFormat") as LagFormat | null;
  const fellesLek = formData.get("fellesLek") === "on";
  const kvaliteter = formData
    .getAll("kvaliteter")
    .map(String)
    .filter((k): k is Kvalitet => (ALLE_KVALITETER as string[]).includes(k));

  const ovelse = await prisma.ovelse.create({
    data: {
      navn,
      beskrivelse: beskrivelse || null,
      lokasjon: lokasjon || null,
      type,
      lagFormat: type === "LAG" ? lagFormat : null,
      kvaliteter,
      fellesLek,
      sesongId: sesong.id,
      vertId: bruker.id,
    },
  });

  revalidatePath("/ovelser");
  revalidatePath("/profil");
  redirect(`/ovelser/${ovelse.id}`);
}

// ─── Bracket-generator for 8 deltagere (dobbel-eliminering) ───

type KampSlot = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
};

function bracketSlots(): KampSlot[] {
  const slots: KampSlot[] = [];

  for (let r = 1; r <= 3; r++) {
    const antall = Math.pow(2, 3 - r);
    for (let p = 1; p <= antall; p++) {
      slots.push({ bracket: "W", runde: r, posisjon: p });
    }
  }

  slots.push({ bracket: "L", runde: 1, posisjon: 1 });
  slots.push({ bracket: "L", runde: 1, posisjon: 2 });
  slots.push({ bracket: "L", runde: 2, posisjon: 1 });
  slots.push({ bracket: "L", runde: 2, posisjon: 2 });
  slots.push({ bracket: "L", runde: 3, posisjon: 1 });
  slots.push({ bracket: "L", runde: 4, posisjon: 1 });
  slots.push({ bracket: "G", runde: 1, posisjon: 1 });

  return slots;
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
