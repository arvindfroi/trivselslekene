"use server";

import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { bildeUrlFor } from "@/lib/bilde";
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
};

export async function hentDeltakerInfo(
  userId: string,
): Promise<DeltakerInfo | null> {
  const sesong = await sikreAktivSesong();

  const bruker = await prisma.user.findUnique({
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
          ovelse: { select: { id: true, kvaliteter: true } },
        },
      },
      lagmedlemskap: {
        where: { lag: { ovelse: { sesongId: sesong.id } } },
        select: {
          lag: {
            select: {
              ovelseId: true,
              resultat: { select: { plassering: true, poeng: true } },
              ovelse: { select: { id: true, kvaliteter: true } },
            },
          },
        },
      },
    },
  });

  if (!bruker) return null;

  // Beregn statistikk — samme logikk som hentSpillerdetaljer i stilling.ts
  const spill = new Set<string>();
  const perKval = new Map<Kvalitet, number>();
  let seire = 0;
  let sum = 0;
  let rekord = 0;

  for (const r of bruker.individuelleResultater) {
    spill.add(r.ovelseId);
    sum += r.poeng;
    if (r.poeng > rekord) rekord = r.poeng;
    if (r.plassering === 1) seire += 1;
    for (const k of r.ovelse.kvaliteter) {
      perKval.set(k, (perKval.get(k) ?? 0) + r.poeng);
    }
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
  }

  const kamper = spill.size;

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
  };
}
