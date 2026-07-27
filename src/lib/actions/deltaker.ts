"use server";

import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { bildeUrlFor } from "@/lib/bilde";
import { ALLE_KVALITETER } from "@/lib/ovelseLabels";
import type { Kvalitet } from "@prisma/client";

export type DeltakerInfo = {
  userId: string;
  navn: string;
  bildeUrl: string | null;
  farge: string | null;
  totalPoeng: number;
  antallLeker: number;
  seire: number;
  snitt: number;
  rekord: number;
  kvaliteter: { kvalitet: Kvalitet; poeng: number }[];
  /** Leker deltakeren har arrangert som vert. */
  vertFor: { id: string; navn: string; status: string }[];
  /** Resultater fra alle leker deltakeren har deltatt i. */
  resultater: {
    ovelseNavn: string;
    plassering: number | null;
    poeng: number;
  }[];
  /** Høyeste poengsum per kvalitet på tvers av ALLE deltakere (for kiviatdiagram). */
  kvalitetMaks: Record<Kvalitet, number>;
};

export async function hentDeltakerInfo(
  userId: string,
): Promise<DeltakerInfo | null> {
  const sesong = await sikreAktivSesong();

  const [bruker, alleBrukere, vertFor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        navn: true,
        bildeUrl: true,
        farge: true,
        individuelleResultater: {
          where: { ovelse: { sesongId: sesong.id } },
          select: {
            ovelseId: true,
            plassering: true,
            poeng: true,
            ovelse: {
              select: { id: true, navn: true, kvaliteter: true },
            },
          },
        },
        lagmedlemskap: {
          where: { lag: { ovelse: { sesongId: sesong.id } } },
          select: {
            lag: {
              select: {
                ovelseId: true,
                resultat: {
                  select: { plassering: true, poeng: true },
                },
                ovelse: {
                  select: { id: true, navn: true, kvaliteter: true },
                },
              },
            },
          },
        },
      },
    }),
    // Hent ALLE brukere sine resultater for å beregne kvalitetMaks
    prisma.user.findMany({
      where: { gjesteDeltaker: false },
      select: {
        id: true,
        individuelleResultater: {
          where: { ovelse: { sesongId: sesong.id } },
          select: {
            poeng: true,
            ovelse: { select: { kvaliteter: true } },
          },
        },
        lagmedlemskap: {
          where: { lag: { ovelse: { sesongId: sesong.id } } },
          select: {
            lag: {
              select: {
                resultat: { select: { poeng: true } },
                ovelse: { select: { kvaliteter: true } },
              },
            },
          },
        },
      },
    }),
    // Leker deltakeren har arrangert
    prisma.ovelse.findMany({
      where: { sesongId: sesong.id, vertId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, navn: true, status: true },
    }),
  ]);

  if (!bruker) return null;

  // ─── Beregn spillerens statistikk ───

  const spill = new Set<string>();
  const perKval = new Map<Kvalitet, number>();
  let seire = 0;
  let sum = 0;
  let rekord = 0;
  const resultater: DeltakerInfo["resultater"] = [];

  for (const r of bruker.individuelleResultater) {
    spill.add(r.ovelseId);
    sum += r.poeng;
    if (r.poeng > rekord) rekord = r.poeng;
    if (r.plassering === 1) seire += 1;
    for (const k of r.ovelse.kvaliteter) {
      perKval.set(k, (perKval.get(k) ?? 0) + r.poeng);
    }
    resultater.push({
      ovelseNavn: r.ovelse.navn,
      plassering: r.plassering,
      poeng: r.poeng,
    });
  }

  for (const m of bruker.lagmedlemskap) {
    const { lag } = m;
    if (!lag.resultat) continue;
    spill.add(lag.ovelseId);
    sum += lag.resultat.poeng;
    if (lag.resultat.poeng > rekord) rekord = lag.resultat.poeng;
    if (lag.resultat.plassering === 1) seire += 1;
    for (const k of lag.ovelse.kvaliteter) {
      perKval.set(k, (perKval.get(k) ?? 0) + lag.resultat.poeng);
    }
    resultater.push({
      ovelseNavn: lag.ovelse.navn,
      plassering: lag.resultat.plassering,
      poeng: lag.resultat.poeng,
    });
  }

  // Sorter resultater etter poeng (høyest først)
  resultater.sort((a, b) => b.poeng - a.poeng);

  const kamper = spill.size;

  // ─── Beregn kvalitetMaks på tvers av ALLE brukere ───

  const globalMaks = new Map<Kvalitet, number>();
  for (const k of ALLE_KVALITETER) globalMaks.set(k, 0);

  const leggTilGlobal = (kvaliteter: Kvalitet[], poeng: number) => {
    if (!poeng) return;
    for (const k of kvaliteter) {
      const naa = globalMaks.get(k) ?? 0;
      if (poeng > naa) globalMaks.set(k, poeng);
    }
  };

  for (const b of alleBrukere) {
    for (const r of b.individuelleResultater) {
      leggTilGlobal(r.ovelse.kvaliteter, r.poeng);
    }
    for (const m of b.lagmedlemskap) {
      if (!m.lag.resultat) continue;
      leggTilGlobal(m.lag.ovelse.kvaliteter, m.lag.resultat.poeng);
    }
  }

  const kvalitetMaks = Object.fromEntries(globalMaks) as Record<
    Kvalitet,
    number
  >;

  return {
    userId: bruker.id,
    navn: bruker.navn,
    bildeUrl: bildeUrlFor("bruker", bruker),
    farge: bruker.farge,
    totalPoeng: sum,
    antallLeker: kamper,
    seire,
    snitt: kamper ? sum / kamper : 0,
    rekord,
    kvaliteter: [...perKval.entries()]
      .filter(([, p]) => p > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([kvalitet, poeng]) => ({ kvalitet, poeng })),
    vertFor: vertFor.map((v) => ({
      id: v.id,
      navn: v.navn,
      status: v.status,
    })),
    resultater,
    kvalitetMaks,
  };
}
