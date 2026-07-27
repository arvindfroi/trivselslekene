"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import type { Kvalitet, LagFormat, OvelseStatus, OvelseType } from "@prisma/client";
import { ALLE_KVALITETER } from "@/lib/ovelseLabels";
import { opprettTurnering } from "@/lib/actions/turnering";
import {
  fordelSpillere,
  validerLagFormat,
  type RankedSpiller,
} from "@/lib/lagSeeding";

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

// ─── Delt hjelpefunksjon for øvelsesoppretting ─────────────────────────────

export type OpprettOvelseData = {
  navn: string;
  type: OvelseType;
  lagFormat: LagFormat | null;
  kvaliteter: Kvalitet[];
  fellesLek: boolean;
  lokasjon: string | null;
  beskrivelse: string | null;
  bildeUrl: string | null;
  faser: { tittel?: string; bildeUrl?: string | null }[];
  sesongId: string;
  vertId: string;
  deltagerIder?: string[];
};

export async function opprettOvelseIDb(data: OpprettOvelseData) {
  const ovelse = await prisma.ovelse.create({
    data: {
      navn: data.navn,
      type: data.type,
      lagFormat: data.type === "LAG" ? data.lagFormat : null,
      kvaliteter: data.kvaliteter,
      fellesLek: data.fellesLek,
      lokasjon: data.lokasjon,
      beskrivelse: data.beskrivelse,
      bildeUrl: data.bildeUrl?.startsWith("data:image/") ? data.bildeUrl : null,
      sesongId: data.sesongId,
      vertId: data.vertId,
      faser: data.faser.length > 0
        ? {
            create: data.faser.map((f, i) => ({
              rekkefolge: i + 1,
              tittel: f.tittel?.trim() || null,
              bildeUrl: f.bildeUrl?.startsWith("data:image/") ? f.bildeUrl : null,
            })),
          }
        : undefined,
    },
  });

  if (data.type === "INDIVIDUELL" && data.deltagerIder && data.deltagerIder.length > 0) {
    await prisma.resultatIndividuell.createMany({
      data: data.deltagerIder.map((userId) => ({
        ovelseId: ovelse.id,
        userId,
        poeng: 0,
      })),
    });
  }

  return ovelse;
}

// ─── Server actions ───────────────────────────────────────────────────────

export async function opprettOvelse(
  prev: unknown,
  formData: FormData,
) {
  const opprettType = String(formData.get("opprettType") ?? "ovelse");

  // ─── Turnering ────────────────────────────────────────────────
  if (opprettType === "turnering") {
    // Delegér til turnering.ts — den håndterer auth og redirect
    return opprettTurnering(formData);
  }

  const bruker = await krevInnloggetBruker();
  const sesong = await sikreAktivSesong();

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

  // Når fellesLek er på, skal verten (bruker.id) IKKE filtreres bort fra deltagerlisten
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
        faser = parsedFaser.data; // ta med alle faser, også de uten bilde
      }
    } catch {
      // ugyldig JSON — ignorer
    }
  }


  // ─── Hent deltagere ────────────────────────────────────────────────
  // Når fellesLek er på skal verten (bruker.id) være med som deltager
  const deltagerIder = type === "INDIVIDUELL"
    ? formData
        .getAll("deltagere")
        .map(String)
        .filter((id) => id && (fellesLek || id !== bruker.id))
    : undefined;

  // ─── Opprett øvelse via delt hjelpefunksjon ────────────────────────
  const ovelse = await opprettOvelseIDb({
    navn: parsed.data.navn,
    type,
    lagFormat: type === "LAG" ? lagFormat : null,
    kvaliteter,
    fellesLek,
    lokasjon: lokasjon || null,
    beskrivelse: beskrivelse || null,
    bildeUrl: bildeUrl?.startsWith("data:image/") ? bildeUrl : null,
    faser,
    sesongId: sesong.id,
    vertId: bruker.id,
    deltagerIder,
  });

  revalidatePath("/ovelser");
  revalidatePath("/profil");
  redirect(`/ovelser/${ovelse.id}`);
}

export async function slettOvelse(ovelseId: string) {
  const bruker = await krevInnloggetBruker();
  // Én betinget sletting: treffer kun hvis innlogget bruker er vert.
  // Bildene ligger i databasen og forsvinner med raden (onDelete: Cascade).
  const slettet = await prisma.ovelse.deleteMany({
    where: { id: ovelseId, vertId: bruker.id },
  });
  if (slettet.count === 0) redirect("/profil");
  revalidatePath("/ovelser");
  revalidatePath("/profil");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
  redirect("/profil");
}

const GYLDIGE_STATUSER: readonly OvelseStatus[] = [
  "PLANLAGT",
  "PAAGAAR",
  "FULLFORT",
];

/** Setter status og vedlikeholder fullfortTid: settes første gang leken
 *  fullføres (gir rekkefølgen i finaleshowets tidslinje), nullstilles ved
 *  gjenåpning. Vert-sjekken ligger i where-betingelsen. */
async function settStatusMedTid(
  ovelseId: string,
  vertId: string,
  status: OvelseStatus,
) {
  if (status === "FULLFORT") {
    await prisma.$transaction([
      prisma.ovelse.updateMany({
        where: { id: ovelseId, vertId, fullfortTid: null },
        data: { fullfortTid: new Date() },
      }),
      prisma.ovelse.updateMany({
        where: { id: ovelseId, vertId },
        data: { status },
      }),
    ]);
  } else {
    await prisma.ovelse.updateMany({
      where: { id: ovelseId, vertId },
      data: { status, fullfortTid: null },
    });
  }
}

export async function settOvelseStatus(ovelseId: string, status: OvelseStatus) {
  const bruker = await krevInnloggetBruker();
  if (!GYLDIGE_STATUSER.includes(status)) return;
  await settStatusMedTid(ovelseId, bruker.id, status);
  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/ovelser");
}

const STATUS_REKKEFOLGE: Record<OvelseStatus, OvelseStatus> = {
  PLANLAGT: "PAAGAAR",
  PAAGAAR: "FULLFORT",
  FULLFORT: "PLANLAGT",
};

/** Sykler øvelsens status til neste: PLANLAGT → PÅGÅR → FULLFØRT → PLANLAGT. */
export async function nesteOvelseStatus(ovelseId: string) {
  const bruker = await krevInnloggetBruker();

  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId, vertId: bruker.id },
    select: { status: true },
  });
  if (!ovelse) return;

  const neste = STATUS_REKKEFOLGE[ovelse.status];
  await settStatusMedTid(ovelseId, bruker.id, neste);

  if (neste === "FULLFORT") {
    await beregnAutoPlassering(ovelseId);
  }

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/ovelser");
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
}

export async function settAktivFase(ovelseId: string, fase: number) {
  const bruker = await krevInnloggetBruker();
  if (!Number.isInteger(fase) || fase < 0) return;
  // Én betinget oppdatering: treffer kun hvis brukeren er vert og fasen
  // faktisk finnes (fase 0 = "skjul faser" er alltid lov). Erstatter den
  // gamle les-valider-skriv-flyten som brukte to sekvensielle rundturer.
  await prisma.ovelse.updateMany({
    where: {
      id: ovelseId,
      vertId: bruker.id,
      ...(fase > 0 ? { faser: { some: { rekkefolge: fase } } } : {}),
    },
    data: { aktivFase: fase },
  });
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
  const bruker = await krevInnloggetBruker();
  // Vert-sjekken uttrykkes som relasjonsfilter — én rundtur i stedet for to.
  await prisma.lagMedlem.deleteMany({
    where: {
      id: lagmedlemId,
      lag: { ovelse: { id: ovelseId, vertId: bruker.id } },
    },
  });
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

export async function lagreResultaterIndividuellMasse(
  ovelseId: string,
  resultater: { userId: string; plassering: number | null; poeng: number; bonusPoeng: number }[],
) {
  await krevVert(ovelseId);

  if (resultater.length === 0) return;

  // Kjør alle upserts i én transaksjon. Resultater for deltakere som er
  // fjernet fra rangeringen slettes, så listen i databasen alltid speiler
  // det verten ser.
  await prisma.$transaction([
    prisma.resultatIndividuell.deleteMany({
      where: { ovelseId, userId: { notIn: resultater.map((r) => r.userId) } },
    }),
    ...resultater.map((r) =>
      prisma.resultatIndividuell.upsert({
        where: { ovelseId_userId: { ovelseId, userId: r.userId } },
        create: {
          ovelseId,
          userId: r.userId,
          plassering: r.plassering,
          poeng: r.poeng,
          bonusPoeng: r.bonusPoeng,
        },
        update: {
          plassering: r.plassering,
          poeng: r.poeng,
          bonusPoeng: r.bonusPoeng,
        },
      }),
    ),
  ]);

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
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

// ─── Eliminering mellom faser ─────────────────────────────────────────────

/** Marker en deltaker som slått ut i øvelsens nåværende aktive fase. */
export async function eliminerDeltaker(ovelseId: string, userId: string) {
  const bruker = await krevInnloggetBruker();

  // Hent aktivFase for å vite hvilken fase deltakeren slås ut i
  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId, vertId: bruker.id },
    select: { aktivFase: true },
  });
  if (!ovelse || ovelse.aktivFase < 1) return; // må ha en aktiv fase

  await prisma.resultatIndividuell.updateMany({
    where: { ovelseId, userId },
    data: { utgattFase: ovelse.aktivFase },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
}

/** Angre en eliminering — sett deltakeren tilbake til aktiv. */
export async function angreEliminering(ovelseId: string, userId: string) {
  const bruker = await krevInnloggetBruker();
  // Vert-sjekk via deleteMany-mønster: kun vert kan angre
  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId, vertId: bruker.id },
    select: { id: true },
  });
  if (!ovelse) return;

  await prisma.resultatIndividuell.updateMany({
    where: { ovelseId, userId },
    data: { utgattFase: null },
  });

  revalidatePath(`/ovelser/${ovelseId}`);
}

/**
 * Beregn automatisk plassering basert på elimineringsrekkefølge.
 * - Spillere uten utgattFase (overlevde alle faser) får topplasseringer
 *   i den rekkefølgen de allerede står (manuelt rangert).
 * - Spillere med utgattFase får bunnplasseringer: sist utslått = best plass,
 *   først utslått = dårligst plass.
 * Returnerer en liste med { userId, plassering } som kan brukes til
 * å oppdatere resultatene, eller null hvis ingen har utgattFase.
 */
export async function beregnAutoPlassering(ovelseId: string) {
  await krevVert(ovelseId);

  const resultater = await prisma.resultatIndividuell.findMany({
    where: { ovelseId },
    select: { id: true, userId: true, plassering: true, utgattFase: true },
    orderBy: [{ plassering: { sort: "asc", nulls: "last" } }, { utgattFase: "asc" }],
  });

  const harEliminering = resultater.some((r) => r.utgattFase !== null);
  if (!harEliminering) return;

  // Del opp i overlevende og utslåtte
  const overlevende = resultater.filter((r) => r.utgattFase === null);
  // Sorter utslåtte: sist utslått (høyest fase) = best plassering
  const utslaatte = resultater
    .filter((r) => r.utgattFase !== null)
    .sort((a, b) => (b.utgattFase ?? 0) - (a.utgattFase ?? 0));

  const totalt = resultater.length;
  const oppdateringer: { id: string; plassering: number }[] = [];

  // Overlevende får topplasseringer (1, 2, 3, ...)
  overlevende.forEach((r, i) => {
    if (r.plassering !== i + 1) {
      oppdateringer.push({ id: r.id, plassering: i + 1 });
    }
  });

  // Utslåtte får bunnplasseringer (totalt, totalt-1, totalt-2, ...)
  utslaatte.forEach((r, i) => {
    const plass = totalt - i;
    if (r.plassering !== plass) {
      oppdateringer.push({ id: r.id, plassering: plass });
    }
  });

  if (oppdateringer.length === 0) return;

  await prisma.$transaction(
    oppdateringer.map((o) =>
      prisma.resultatIndividuell.update({
        where: { id: o.id },
        data: { plassering: o.plassering },
      }),
    ),
  );

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/stilling");
}

// ─── Auto-opprett lag ────────────────────────────────────────────────────

export async function autoOpprettLag(ovelseId: string) {
  const bruker = await krevVert(ovelseId);

  // ─── Hent øvelsen med nødvendig info ─────────────────────────
  const ovelse = await prisma.ovelse.findUnique({
    where: { id: ovelseId },
    select: {
      id: true,
      type: true,
      lagFormat: true,
      fellesLek: true,
      sesongId: true,
      vertId: true,
    },
  });

  if (!ovelse || ovelse.type !== "LAG" || !ovelse.lagFormat) {
    return { error: "Denne leken har ikke lagoppsett." };
  }

  // ─── Hent deltakere (alle brukere, minus vert med mindre fellesLek) ───
  const brukere = await prisma.user.findMany({
    where: ovelse.fellesLek ? {} : { id: { not: ovelse.vertId } },
    select: { id: true, navn: true },
    orderBy: { navn: "asc" },
  });

  const deltakerIder = brukere.map((b) => b.id);

  // ─── Valider lagformatet ─────────────────────────────────────
  const validering = validerLagFormat(ovelse.lagFormat, brukere.length);
  if (!validering.ok) {
    return { error: validering.feilmelding };
  }

  const { struktur } = validering;

  // ─── Hent stilling for seeding ──────────────────────────────
  const stilling = await hentStillingForSeeding(ovelse.sesongId, deltakerIder);

  // Slå sammen stilling med alle deltakere (nye deltakere uten poeng får 0)
  const ranked: RankedSpiller[] = brukere.map((b) => {
    const s = stilling.find((s) => s.userId === b.id);
    return { id: b.id, navn: b.navn, poeng: s?.poeng ?? 0 };
  });

  // ─── Fordel spillere på lag via snake draft ──────────────────
  const lagene = fordelSpillere(ranked, struktur);

  // ─── Opprett lag og legg til medlemmer i én transaksjon ─────
  await prisma.$transaction(
    lagene.map((lag) =>
      prisma.lag.create({
        data: {
          navn: lag.navn,
          ovelseId: ovelse.id,
          medlemmer: {
            create: lag.medlemmer.map((userId) => ({ userId })),
          },
        },
      }),
    ),
  );

  revalidatePath(`/ovelser/${ovelseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/stilling");

  return { ok: true, antallLag: lagene.length };
}

// ─── Lettvekts stilling-henting for seeding ───────────────────────────────

type StillingForSeeding = { userId: string; navn: string; poeng: number };

async function hentStillingForSeeding(
  sesongId: string,
  deltakerIder: string[],
): Promise<StillingForSeeding[]> {
  const brukere = await prisma.user.findMany({
    where: { id: { in: deltakerIder } },
    select: {
      id: true,
      navn: true,
      individuelleResultater: {
        where: { ovelse: { sesongId } },
        select: { poeng: true },
      },
      lagmedlemskap: {
        where: { lag: { ovelse: { sesongId } } },
        select: {
          lag: {
            select: {
              resultat: { select: { poeng: true } },
            },
          },
        },
      },
    },
  });

  return brukere.map((b) => {
    const individuellePoeng = b.individuelleResultater.reduce(
      (sum, r) => sum + r.poeng,
      0,
    );
    const lagPoeng = b.lagmedlemskap.reduce((sum, m) => {
      return sum + (m.lag.resultat?.poeng ?? 0);
    }, 0);

    return {
      userId: b.id,
      navn: b.navn,
      poeng: individuellePoeng + lagPoeng,
    };
  });
}
