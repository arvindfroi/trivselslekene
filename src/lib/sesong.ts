import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Henter aktiv sesong for inneværende år, og oppretter den hvis den ikke finnes. */
export const sikreAktivSesong = cache(async () => {
  const aar = new Date().getFullYear();

  const eksisterende = await prisma.sesong.findUnique({ where: { aar } });
  if (eksisterende) return eksisterende;

  return prisma.sesong.create({
    data: {
      aar,
      navn: `Trivselslekene ${aar}`,
      aktiv: true,
    },
  });
});
