import { prisma } from "@/lib/prisma";

export type StillingRad = {
  userId: string;
  navn: string;
  totalPoeng: number;
  antallOvelser: number;
};

/** Beregner sammenlagt stilling for en sesong, sortert med flest poeng øverst. */
export async function hentStilling(sesongId: string): Promise<StillingRad[]> {
  const brukere = await prisma.user.findMany({
    include: {
      individuelleResultater: { where: { ovelse: { sesongId } } },
      lagmedlemskap: {
        include: { lag: { include: { resultat: true, ovelse: true } } },
      },
    },
    orderBy: { navn: "asc" },
  });

  return brukere
    .map((bruker) => {
      const individOvelser = new Set(
        bruker.individuelleResultater.map((r) => r.ovelseId)
      );
      const poengIndividuelt = bruker.individuelleResultater.reduce(
        (sum, r) => sum + r.poeng,
        0
      );

      const lagOvelser = new Set<string>();
      let poengLag = 0;
      for (const medlemskap of bruker.lagmedlemskap) {
        const { lag } = medlemskap;
        if (lag.ovelse.sesongId !== sesongId) continue;
        if (lag.resultat) {
          poengLag += lag.resultat.poeng;
          lagOvelser.add(lag.ovelseId);
        }
      }

      return {
        userId: bruker.id,
        navn: bruker.navn,
        totalPoeng: poengIndividuelt + poengLag,
        antallOvelser: new Set([...individOvelser, ...lagOvelser]).size,
      };
    })
    .sort((a, b) => b.totalPoeng - a.totalPoeng);
}
