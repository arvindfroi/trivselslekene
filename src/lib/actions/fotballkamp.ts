"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";

export async function opprettFotballKamp(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/bli-med");

  const navn = String(formData.get("navn") ?? "").trim();
  const lokasjon = String(formData.get("lokasjon") ?? "").trim();

  if (!navn) return;

  const sesong = await sikreAktivSesong();

  await prisma.ovelse.create({
    data: {
      navn,
      lokasjon: lokasjon || null,
      type: "LAG",
      lagFormat: "FIRE_MOT_FEM",
      kvaliteter: ["LAGSPILL", "UTHOLDENHET", "TAKTIKK"],
      sesongId: sesong.id,
      vertId: session.user.id,
      lag: {
        create: [
          { navn: "Lag 1 (4)" },
          { navn: "Lag 2 (5)" },
        ],
      },
    },
  });

  revalidatePath("/fotball-kamp");
  redirect(`/fotball-kamp`);
}
