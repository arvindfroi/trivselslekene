"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";

async function cleanupDUsers() {
  // Finn alle D-brukere
  const dUsers = await prisma.user.findMany({
    where: { navn: { startsWith: "D" } },
    select: { id: true },
  });
  const dIds = dUsers.map((u) => u.id);
  if (dIds.length === 0) return;

  // Slett i riktig FK-rekkefølge
  await prisma.turneringsKamp.updateMany({
    where: { vinnerId: { in: dIds } },
    data: { vinnerId: null },
  });
  await prisma.turneringsKamp.updateMany({
    where: { OR: [{ deltager1Id: { in: dIds } }, { deltager2Id: { in: dIds } }] },
    data: { deltager1Id: null, deltager2Id: null },
  });
  await prisma.turneringsDeltager.deleteMany({ where: { userId: { in: dIds } } });
  await prisma.lagMedlem.deleteMany({ where: { userId: { in: dIds } } });
  await prisma.resultatIndividuell.deleteMany({ where: { userId: { in: dIds } } });
  await prisma.resultatLag.deleteMany({
    where: { lag: { medlemmer: { some: { userId: { in: dIds } } } } },
  });
  await prisma.lag.deleteMany({
    where: { medlemmer: { some: { userId: { in: dIds } } } },
  });
  await prisma.ovelse.deleteMany({
    where: { OR: [{ vertId: { in: dIds } }, { navn: "Testpoeng" }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: dIds } } });
}

export async function opprettTestdeltakere() {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  await cleanupDUsers();

  // Opprett D1–D9 med poeng: D1=1, D2=2, … D9=9
  const users: { id: string; navn: string }[] = [];
  for (let i = 1; i <= 9; i++) {
    const u = await prisma.user.create({
      data: { navn: `D${i}` },
    });
    users.push(u);
  }

  // Gi dem poeng via en dummy-øvelse
  const ovelse = await prisma.ovelse.create({
    data: {
      navn: "Testpoeng",
      type: "INDIVIDUELL",
      kvaliteter: [],
      sesongId: sesong.id,
      vertId: session.user.id,
      status: "FULLFORT",
    },
  });

  for (let i = 0; i < users.length; i++) {
    const poeng = i + 1;
    await prisma.resultatIndividuell.create({
      data: {
        ovelseId: ovelse.id,
        userId: users[i].id,
        plassering: 9 - i,
        poeng,
      },
    });
  }

  revalidatePath("/fotball-kamp");
  revalidatePath("/ovelser");
  revalidatePath("/stilling");
  revalidatePath("/dashboard");
  redirect("/stilling");
}

export async function slettTestdeltakere() {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  await cleanupDUsers();

  revalidatePath("/fotball-kamp");
  revalidatePath("/ovelser");
  revalidatePath("/stilling");
  revalidatePath("/dashboard");
  redirect("/ovelser");
}
