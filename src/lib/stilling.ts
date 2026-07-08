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

export type Utmerkelse = {
  key: string;
  leder: {
    userId: string;
    navn: string;
    bildeUrl: string | null;
    verdi: string;
  } | null;
};

/**
 * "Rekorder og utmerkelser" à la Mario Party / sport-apper — statistikk som
 * ikke er knyttet til lekenes egenskaper, men til hvordan folk presterer.
 */
export async function hentUtmerkelser(sesongId: string): Promise<Utmerkelse[]> {
  const [brukere, ovelser] = await Promise.all([
    prisma.user.findMany({
      include: {
        individuelleResultater: {
          where: { ovelse: { sesongId } },
          include: { ovelse: { select: { id: true, kvaliteter: true } } },
        },
        lagmedlemskap: {
          include: {
            lag: {
              include: {
                resultat: true,
                ovelse: { select: { id: true, sesongId: true, kvaliteter: true } },
              },
            },
          },
        },
      },
    }),
    prisma.ovelse.findMany({
      where: { sesongId },
      select: { vertId: true },
    }),
  ]);

  const vertAntall = new Map<string, number>();
  for (const o of ovelser) {
    vertAntall.set(o.vertId, (vertAntall.get(o.vertId) ?? 0) + 1);
  }

  const rader = brukere.map((b) => {
    const spill = new Set<string>();
    const egenskaper = new Set<Kvalitet>();
    let seire = 0;
    let pall = 0;
    let sum = 0;
    let rekord = 0;

    const reg = (
      ovelseId: string,
      kvaliteter: Kvalitet[],
      plassering: number | null,
      p: number
    ) => {
      spill.add(ovelseId);
      sum += p;
      if (p > rekord) rekord = p;
      if (plassering === 1) seire += 1;
      if (plassering !== null && plassering <= 3) pall += 1;
      for (const k of kvaliteter) egenskaper.add(k);
    };

    for (const r of b.individuelleResultater) {
      reg(r.ovelse.id, r.ovelse.kvaliteter, r.plassering, r.poeng);
    }
    for (const m of b.lagmedlemskap) {
      const { lag } = m;
      if (lag.ovelse.sesongId !== sesongId || !lag.resultat) continue;
      reg(
        lag.ovelse.id,
        lag.ovelse.kvaliteter,
        lag.resultat.plassering,
        lag.resultat.poeng
      );
    }

    const kamper = spill.size;
    return {
      userId: b.id,
      navn: b.navn,
      bildeUrl: b.bildeUrl,
      kamper,
      seire,
      pall,
      snitt: kamper >= 2 ? sum / kamper : 0,
      rekord,
      egenskaper: egenskaper.size,
      verter: vertAntall.get(b.id) ?? 0,
    };
  });

  const utmerkelse = (
    key: string,
    verdiAv: (r: (typeof rader)[number]) => number,
    minst: number,
    format: (v: number) => string
  ): Utmerkelse => {
    let beste: { r: (typeof rader)[number]; v: number } | null = null;
    for (const r of rader) {
      const v = verdiAv(r);
      if (v < minst) continue;
      if (!beste || v > beste.v) beste = { r, v };
    }
    return {
      key,
      leder: beste
        ? {
            userId: beste.r.userId,
            navn: beste.r.navn,
            bildeUrl: beste.r.bildeUrl,
            verdi: format(beste.v),
          }
        : null,
    };
  };

  return [
    utmerkelse("seire", (r) => r.seire, 1, (v) => `${v} seire`),
    utmerkelse("pall", (r) => r.pall, 1, (v) => `${v} pallplasser`),
    utmerkelse("kamper", (r) => r.kamper, 1, (v) => `${v} kamper`),
    utmerkelse("snitt", (r) => r.snitt, 0.01, (v) => `${v.toFixed(1)} i snitt`),
    utmerkelse("rekord", (r) => r.rekord, 1, (v) => `${v} poeng`),
    utmerkelse("allsidig", (r) => r.egenskaper, 1, (v) => `${v} egenskaper`),
    utmerkelse("vert", (r) => r.verter, 1, (v) => `${v} leker`),
  ];
}
