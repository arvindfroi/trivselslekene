import { prisma } from "@/lib/prisma";
import type { Kvalitet } from "@prisma/client";
import { ALLE_KVALITETER } from "@/lib/ovelseLabels";

export type StillingRad = {
  userId: string;
  navn: string;
  bildeUrl: string | null;
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
        bildeUrl: bruker.bildeUrl,
        totalPoeng: poengIndividuelt + poengLag,
        antallOvelser: new Set([...individOvelser, ...lagOvelser]).size,
      };
    })
    .sort((a, b) => b.totalPoeng - a.totalPoeng);
}

export type KvalitetsLeder = {
  kvalitet: Kvalitet;
  leder: {
    userId: string;
    navn: string;
    bildeUrl: string | null;
    poeng: number;
  } | null;
};

/**
 * Finner den beste deltakeren innen hver egenskap. En deltakers poeng i en
 * øvelse teller for alle egenskapene den øvelsen tester (individuelt + lag).
 */
export async function hentKvalitetsledere(
  sesongId: string
): Promise<KvalitetsLeder[]> {
  const brukere = await prisma.user.findMany({
    include: {
      individuelleResultater: {
        where: { ovelse: { sesongId } },
        include: { ovelse: { select: { kvaliteter: true } } },
      },
      lagmedlemskap: {
        include: {
          lag: {
            include: {
              resultat: true,
              ovelse: { select: { kvaliteter: true, sesongId: true } },
            },
          },
        },
      },
    },
  });

  // poeng per egenskap per bruker
  const poeng = new Map<Kvalitet, Map<string, number>>();
  for (const k of ALLE_KVALITETER) poeng.set(k, new Map());

  const leggTil = (
    userId: string,
    kvaliteter: Kvalitet[],
    verdi: number
  ) => {
    if (!verdi) return;
    for (const k of kvaliteter) {
      const kart = poeng.get(k)!;
      kart.set(userId, (kart.get(userId) ?? 0) + verdi);
    }
  };

  const navnKart = new Map<string, { navn: string; bildeUrl: string | null }>();

  for (const bruker of brukere) {
    navnKart.set(bruker.id, { navn: bruker.navn, bildeUrl: bruker.bildeUrl });

    for (const r of bruker.individuelleResultater) {
      leggTil(bruker.id, r.ovelse.kvaliteter, r.poeng);
    }
    for (const m of bruker.lagmedlemskap) {
      const { lag } = m;
      if (lag.ovelse.sesongId !== sesongId || !lag.resultat) continue;
      leggTil(bruker.id, lag.ovelse.kvaliteter, lag.resultat.poeng);
    }
  }

  return ALLE_KVALITETER.map((kvalitet) => {
    const kart = poeng.get(kvalitet)!;
    let beste: KvalitetsLeder["leder"] = null;
    for (const [userId, p] of kart) {
      if (p <= 0) continue;
      if (!beste || p > beste.poeng) {
        const info = navnKart.get(userId)!;
        beste = { userId, navn: info.navn, bildeUrl: info.bildeUrl, poeng: p };
      }
    }
    return { kvalitet, leder: beste };
  });
}
