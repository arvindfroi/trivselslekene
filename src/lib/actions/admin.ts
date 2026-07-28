"use server";

import { prisma } from "@/lib/prisma";
import { krevInnloggetBruker } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function opprettSesong(formData: FormData) {
  await krevInnloggetBruker();
  const aar = parseInt(formData.get("aar") as string);
  if (!aar || aar < 2020 || aar > 2100) return;

  const eksisterende = await prisma.sesong.findUnique({ where: { aar } });
  if (eksisterende) return;

  await prisma.sesong.create({
    data: { aar, navn: `Trivselslekene ${aar}`, aktiv: false },
  });

  revalidatePath("/admin");
}

export async function settAktivSesong(formData: FormData) {
  await krevInnloggetBruker();
  const sesongId = formData.get("sesongId") as string;
  if (!sesongId) return;

  await prisma.sesong.updateMany({ data: { aktiv: false } });
  await prisma.sesong.update({ where: { id: sesongId }, data: { aktiv: true } });

  revalidatePath("/admin");
}

/**
 * Sletter en bruker og alt som henger på personen: lekene hen er vert for
 * (inkl. turneringen bak en turneringslek), egne resultater, lagmedlemskap og
 * turneringsdeltakelser. Lag brukeren var med i beholdes så lenge det er andre
 * medlemmer igjen — blir laget tomt, forsvinner det med lagresultatet sitt.
 *
 * Rekkefølgen er styrt av fremmednøklene: relasjonene fra User er påkrevde og
 * dermed `Restrict`, så barna må bort før selve brukeren kan slettes.
 */
export async function slettBruker(userId: string) {
  const innlogget = await krevInnloggetBruker();

  if (userId === innlogget.id) {
    return { ok: false, feil: "Du kan ikke slette din egen bruker." };
  }

  const bruker = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, navn: true },
  });
  if (!bruker) return { ok: false, feil: "Brukeren finnes ikke." };

  await prisma.$transaction(async (tx) => {
    // 1. Lekene brukeren er vert for. Ovelse cascader til faser, lag,
    //    lagmedlemmer og resultater. Turneringen bak en turneringslek må tas
    //    eksplisitt: Ovelse.turneringId er SetNull, så den ville ellers blitt
    //    liggende igjen uten lek.
    const vertFor = await tx.ovelse.findMany({
      where: { vertId: userId },
      select: { id: true, turneringId: true },
    });
    const turneringIder = vertFor
      .map((o) => o.turneringId)
      .filter((id): id is string => id !== null);

    await tx.ovelse.deleteMany({ where: { vertId: userId } });
    if (turneringIder.length > 0) {
      // Cascader til kamper og deltagere.
      await tx.turnering.deleteMany({ where: { id: { in: turneringIder } } });
    }

    // 2. Turneringsdeltakelser i andres turneringer. Kampene peker på
    //    deltagerraden, så referansene nullstilles før raden fjernes.
    const deltagerIder = (
      await tx.turneringsDeltager.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((d) => d.id);

    if (deltagerIder.length > 0) {
      await tx.turneringsKamp.updateMany({
        where: { vinnerId: { in: deltagerIder } },
        data: { vinnerId: null },
      });
      await tx.turneringsKamp.updateMany({
        where: { deltager1Id: { in: deltagerIder } },
        data: { deltager1Id: null },
      });
      await tx.turneringsKamp.updateMany({
        where: { deltager2Id: { in: deltagerIder } },
        data: { deltager2Id: null },
      });
      await tx.turneringsDeltager.deleteMany({
        where: { id: { in: deltagerIder } },
      });
    }

    // 3. Egne resultater i andres leker
    await tx.resultatIndividuell.deleteMany({ where: { userId } });

    // 4. Lagmedlemskap. Lag som står igjen uten medlemmer slettes — resultatet
    //    til laget følger med (onDelete: Cascade).
    const lagIder = (
      await tx.lagMedlem.findMany({ where: { userId }, select: { lagId: true } })
    ).map((m) => m.lagId);

    await tx.lagMedlem.deleteMany({ where: { userId } });
    if (lagIder.length > 0) {
      await tx.lag.deleteMany({
        where: { id: { in: lagIder }, medlemmer: { none: {} } },
      });
    }

    // 5. Selve brukeren
    await tx.user.delete({ where: { id: userId } });
  });

  revalidatePath("/admin");
  revalidatePath("/stilling");
  revalidatePath("/ovelser");
  revalidatePath("/dashboard");
  revalidatePath("/profil");
  revalidatePath("/turnering");
  revalidatePath("/fotball-kamp");

  return { ok: true, navn: bruker.navn };
}

export async function slettSesong(aar: number) {
  await krevInnloggetBruker();

  const sesong = await prisma.sesong.findUnique({ where: { aar } });
  if (!sesong) return { ok: false, feil: `Sesong ${aar} finnes ikke.` };

  // Slett i FK-rekkefølge for å unngå constraint-feil
  await prisma.$transaction(async (tx) => {
    // 1. Resultater (individuelle + lag) for øvelser i sesongen
    await tx.resultatIndividuell.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });
    await tx.resultatLag.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });

    // 2. LagMedlemmer for lag i sesongens øvelser
    await tx.lagMedlem.deleteMany({
      where: { lag: { ovelse: { sesongId: sesong.id } } },
    });

    // 3. Lag i sesongens øvelser
    await tx.lag.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });

    // 4. Faser i sesongens øvelser
    await tx.ovelseFase.deleteMany({
      where: { ovelse: { sesongId: sesong.id } },
    });

    // 5. Turneringskamper
    await tx.turneringsKamp.deleteMany({
      where: { turnering: { sesongId: sesong.id } },
    });

    // 6. Turneringsdeltagere
    await tx.turneringsDeltager.deleteMany({
      where: { turnering: { sesongId: sesong.id } },
    });

    // 7. Øvelser i sesongen (inkl. de som er knyttet til turneringer)
    await tx.ovelse.deleteMany({
      where: { sesongId: sesong.id },
    });

    // 8. Turneringer i sesongen
    await tx.turnering.deleteMany({
      where: { sesongId: sesong.id },
    });

    // 9. Selve sesongen
    await tx.sesong.delete({ where: { id: sesong.id } });
  });

  revalidatePath("/admin");
  revalidatePath("/stilling");
  revalidatePath("/ovelser");

  return { ok: true, navn: sesong.navn };
}
