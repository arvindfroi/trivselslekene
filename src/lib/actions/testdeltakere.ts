"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";

export async function opprettTestdeltakere() {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  // Slett gamle testdeltakere
  await prisma.lagMedlem.deleteMany({
    where: { user: { navn: { startsWith: "D" } } },
  });
  await prisma.resultatIndividuell.deleteMany({
    where: { user: { navn: { startsWith: "D" } } },
  });
  await prisma.user.deleteMany({
    where: { navn: { startsWith: "D" } },
  });

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

  // Slett testdata i riktig rekkefølge
  await prisma.lagMedlem.deleteMany({
    where: { user: { navn: { startsWith: "D" } } },
  });
  await prisma.resultatLag.deleteMany({
    where: { lag: { ovelse: { lagFormat: "ANNET" } } },
  });
  await prisma.lag.deleteMany({
    where: { ovelse: { lagFormat: "ANNET" } },
  });
  await prisma.resultatIndividuell.deleteMany({
    where: { user: { navn: { startsWith: "D" } } },
  });
  await prisma.ovelse.deleteMany({
    where: { navn: "Testpoeng" },
  });
  await prisma.ovelse.deleteMany({
    where: { navn: { startsWith: "Fotballkamp" } },
  });
  await prisma.user.deleteMany({
    where: { navn: { startsWith: "D" } },
  });

  revalidatePath("/fotball-kamp");
  revalidatePath("/ovelser");
  revalidatePath("/stilling");
  revalidatePath("/dashboard");
  redirect("/ovelser");
}
