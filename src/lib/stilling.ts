import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Kvalitet } from "@prisma/client";
import { ALLE_KVALITETER } from "@/lib/ovelseLabels";
import { bildeUrlFor } from "@/lib/bilde";

// ─── Typer ───────────────────────────────────────────────────────

export type StillingRad = {
  userId: string;
  navn: string;
  bildeUrl: string | null;
  totalPoeng: number;
  antallOvelser: number;
};

export type KvalitetsLeder = {
  kvalitet: Kvalitet;
  leder: {
    userId: string;
    navn: string;
    bildeUrl: string | null;
    poeng: number;
  } | null;
  topp3: {
    userId: string;
    navn: string;
    bildeUrl: string | null;
    poeng: number;
  }[];
};

export type SpillerDetalj = {
  kvaliteter: { kvalitet: Kvalitet; poeng: number }[];
  kamper: number;
  seire: number;
  snitt: number;
  rekord: number;
};

export type Utmerkelse = {
  key: string;
  leder: {
    userId: string;
    navn: string;
    bildeUrl: string | null;
    verdi: string;
  } | null;
  topp3: {
    userId: string;
    navn: string;
    bildeUrl: string | null;
    verdi: string;
  }[];
};

// ─── Samledata ───────────────────────────────────────────────────

type SesongBruker = {
  id: string;
  navn: string;
  bildeUrl: string | null;
  individuelleResultater: {
    id: string;
    ovelseId: string;
    plassering: number | null;
    poeng: number;
    ovelse: { id: string; kvaliteter: Kvalitet[] };
  }[];
  lagmedlemskap: {
    lag: {
      ovelseId: string;
      resultat: { plassering: number | null; poeng: number } | null;
      ovelse: { id: string; sesongId: string; kvaliteter: Kvalitet[] };
    };
  }[];
};

export type SesongData = {
  brukere: SesongBruker[];
  vertPerOvelse: { vertId: string }[];
};

/** Henter ALL sesong-data i én DB-roundtrip. Brukes av de fire analysefunksjonene. */
export const hentAlleSesongData = cache(async (sesongId: string): Promise<SesongData> => {
  const [brukere, vertPerOvelse] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        navn: true,
        bildeUrl: true,
        individuelleResultater: {
          where: { ovelse: { sesongId } },
          select: {
            id: true,
            ovelseId: true,
            plassering: true,
            poeng: true,
            ovelse: { select: { id: true, kvaliteter: true } },
          },
        },
        lagmedlemskap: {
          where: { lag: { ovelse: { sesongId } } },
          select: {
            lag: {
              select: {
                ovelseId: true,
                resultat: true,
                ovelse: {
                  select: { id: true, sesongId: true, kvaliteter: true },
                },
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

  // Bytt ut base64-blobber med små, cachebare URL-er før dataene når
  // sidene — ellers inlines hvert profilbilde i payloaden på nytt ved
  // hver render av dashboard/stilling/profil.
  const brukereMedLetteBilder = brukere.map((b) => ({
    ...b,
    bildeUrl: bildeUrlFor("bruker", b),
  }));

  return { brukere: brukereMedLetteBilder, vertPerOvelse };
});

// ─── Analysefunksjoner (rene transformasjoner, ingen DB-kall) ────

/** Beregner sammenlagt stilling for en sesong, sortert med flest poeng øverst. */
export function hentStilling(data: SesongData): StillingRad[] {
  return data.brukere
    .map((bruker) => {
      const individOvelser = new Set(
        bruker.individuelleResultater.map((r) => r.ovelseId),
      );
      const poengIndividuelt = bruker.individuelleResultater.reduce(
        (sum, r) => sum + r.poeng,
        0,
      );

      const lagOvelser = new Set<string>();
      let poengLag = 0;
      for (const medlemskap of bruker.lagmedlemskap) {
        const { lag } = medlemskap;
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

/**
 * Finner den beste deltakeren innen hver egenskap. En deltakers poeng i en
 * øvelse teller for alle egenskapene den øvelsen tester (individuelt + lag).
 */
export function hentKvalitetsledere(data: SesongData): KvalitetsLeder[] {
  const { brukere } = data;

  // poeng per egenskap per bruker
  const poeng = new Map<Kvalitet, Map<string, number>>();
  for (const k of ALLE_KVALITETER) poeng.set(k, new Map());

  const leggTil = (userId: string, kvaliteter: Kvalitet[], verdi: number) => {
    if (!verdi) return;
    for (const k of kvaliteter) {
      const kart = poeng.get(k)!;
      kart.set(userId, (kart.get(userId) ?? 0) + verdi);
    }
  };

  const navnKart = new Map<
    string,
    { navn: string; bildeUrl: string | null }
  >();

  for (const bruker of brukere) {
    navnKart.set(bruker.id, { navn: bruker.navn, bildeUrl: bruker.bildeUrl });

    for (const r of bruker.individuelleResultater) {
      leggTil(bruker.id, r.ovelse.kvaliteter, r.poeng);
    }
    for (const m of bruker.lagmedlemskap) {
      const { lag } = m;
      if (!lag.resultat) continue;
      leggTil(bruker.id, lag.ovelse.kvaliteter, lag.resultat.poeng);
    }
  }

  return ALLE_KVALITETER.map((kvalitet) => {
    const kart = poeng.get(kvalitet)!;
    const sortert = [...kart.entries()]
      .filter(([, p]) => p > 0)
      .sort((a, b) => b[1] - a[1]);
    const beste = sortert[0]
      ? {
          userId: sortert[0][0],
          navn: navnKart.get(sortert[0][0])!.navn,
          bildeUrl: navnKart.get(sortert[0][0])!.bildeUrl,
          poeng: sortert[0][1],
        }
      : null;
    const topp3 = sortert.slice(0, 3).map(([userId, p]) => {
      const info = navnKart.get(userId)!;
      return { userId, navn: info.navn, bildeUrl: info.bildeUrl, poeng: p };
    });
    return { kvalitet, leder: beste, topp3 };
  });
}

/** Per-spiller-oppsummering brukt når en rad i stillingen ekspanderes. */
export function hentSpillerdetaljer(
  data: SesongData,
): Record<string, SpillerDetalj> {
  const { brukere } = data;
  const ut: Record<string, SpillerDetalj> = {};

  for (const b of brukere) {
    const perKval = new Map<Kvalitet, number>();
    const spill = new Set<string>();
    let seire = 0;
    let sum = 0;
    let rekord = 0;

    const reg = (
      ovelseId: string,
      kvaliteter: Kvalitet[],
      plassering: number | null,
      p: number,
    ) => {
      spill.add(ovelseId);
      sum += p;
      if (p > rekord) rekord = p;
      if (plassering === 1) seire += 1;
      for (const k of kvaliteter)
        perKval.set(k, (perKval.get(k) ?? 0) + p);
    };

    for (const r of b.individuelleResultater) {
      reg(r.ovelse.id, r.ovelse.kvaliteter, r.plassering, r.poeng);
    }
    for (const m of b.lagmedlemskap) {
      const { lag } = m;
      if (!lag.resultat) continue;
      reg(
        lag.ovelse.id,
        lag.ovelse.kvaliteter,
        lag.resultat.plassering,
        lag.resultat.poeng,
      );
    }

    const kamper = spill.size;
    ut[b.id] = {
      kvaliteter: [...perKval.entries()]
        .filter(([, p]) => p > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([kvalitet, poeng]) => ({ kvalitet, poeng })),
      kamper,
      seire,
      snitt: kamper ? sum / kamper : 0,
      rekord,
    };
  }

  return ut;
}

/**
 * "Rekorder og utmerkelser" à la Mario Party / sport-apper — statistikk som
 * ikke er knyttet til lekenes egenskaper, men til hvordan folk presterer.
 */
export function hentUtmerkelser(data: SesongData): Utmerkelse[] {
  const { brukere, vertPerOvelse } = data;

  const vertAntall = new Map<string, number>();
  for (const o of vertPerOvelse) {
    vertAntall.set(o.vertId, (vertAntall.get(o.vertId) ?? 0) + 1);
  }

  // Alle plasseringer per lek, for å regne ut hvem som endte sist.
  const perLek = new Map<
    string,
    { userId: string; plassering: number | null }[]
  >();

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
      p: number,
    ) => {
      spill.add(ovelseId);
      sum += p;
      if (p > rekord) rekord = p;
      if (plassering === 1) seire += 1;
      if (plassering !== null && plassering <= 3) pall += 1;
      for (const k of kvaliteter) egenskaper.add(k);
      const e = perLek.get(ovelseId) ?? [];
      e.push({ userId: b.id, plassering });
      perLek.set(ovelseId, e);
    };

    for (const r of b.individuelleResultater) {
      reg(r.ovelse.id, r.ovelse.kvaliteter, r.plassering, r.poeng);
    }
    for (const m of b.lagmedlemskap) {
      const { lag } = m;
      if (!lag.resultat) continue;
      reg(
        lag.ovelse.id,
        lag.ovelse.kvaliteter,
        lag.resultat.plassering,
        lag.resultat.poeng,
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
      sisteplasser: 0,
    };
  });

  // Sisteplasser: i hver lek med minst to plasserte teller den/de med dårligst plassering.
  const sisteKart = new Map<string, number>();
  for (const [, poster] of perLek) {
    const medPlass = poster.filter(
      (e): e is { userId: string; plassering: number } =>
        e.plassering !== null,
    );
    if (medPlass.length < 2) continue;
    const maks = Math.max(...medPlass.map((e) => e.plassering));
    if (maks <= 1) continue;
    for (const e of medPlass) {
      if (e.plassering === maks) {
        sisteKart.set(e.userId, (sisteKart.get(e.userId) ?? 0) + 1);
      }
    }
  }
  for (const r of rader) r.sisteplasser = sisteKart.get(r.userId) ?? 0;

  type Rad = (typeof rader)[number];
  const finn = (
    verdiAv: (r: Rad) => number,
    gyldig: (r: Rad) => boolean,
    lavest = false,
  ): { r: Rad; v: number } | null => {
    let valgt: { r: Rad; v: number } | null = null;
    for (const r of rader) {
      if (!gyldig(r)) continue;
      const v = verdiAv(r);
      if (!valgt || (lavest ? v < valgt.v : v > valgt.v))
        valgt = { r, v };
    }
    return valgt;
  };
  const toppN = (
    verdiAv: (r: Rad) => number,
    gyldig: (r: Rad) => boolean,
    lavest = false,
    n = 3,
  ): { r: Rad; v: number }[] => {
    return rader
      .filter(gyldig)
      .map((r) => ({ r, v: verdiAv(r) }))
      .sort((a, b) => (lavest ? a.v - b.v : b.v - a.v))
      .slice(0, n);
  };
  const pakk = (
    key: string,
    d: { r: Rad; v: number } | null,
    format: (v: number) => string,
    top3: { r: Rad; v: number }[],
  ): Utmerkelse => ({
    key,
    leder: d
      ? {
          userId: d.r.userId,
          navn: d.r.navn,
          bildeUrl: d.r.bildeUrl,
          verdi: format(d.v),
        }
      : null,
    topp3: top3.map(({ r, v }) => ({
      userId: r.userId,
      navn: r.navn,
      bildeUrl: r.bildeUrl,
      verdi: format(v),
    })),
  });

  return [
    pakk(
      "seire",
      finn((r) => r.seire, (r) => r.seire >= 1),
      (v) => `${v} seire`,
      toppN((r) => r.seire, (r) => r.seire >= 1),
    ),
    pakk(
      "pall",
      finn((r) => r.pall, (r) => r.pall >= 1),
      (v) => `${v} pallplasser`,
      toppN((r) => r.pall, (r) => r.pall >= 1),
    ),
    pakk(
      "kamper",
      finn((r) => r.kamper, (r) => r.kamper >= 1),
      (v) => `${v} kamper`,
      toppN((r) => r.kamper, (r) => r.kamper >= 1),
    ),
    pakk(
      "snitt",
      finn((r) => r.snitt, (r) => r.kamper >= 2),
      (v) => `${v.toFixed(1)} i snitt`,
      toppN((r) => r.snitt, (r) => r.kamper >= 2),
    ),
    pakk(
      "rekord",
      finn((r) => r.rekord, (r) => r.rekord >= 1),
      (v) => `${v} poeng`,
      toppN((r) => r.rekord, (r) => r.rekord >= 1),
    ),
    pakk(
      "allsidig",
      finn((r) => r.egenskaper, (r) => r.egenskaper >= 1),
      (v) => `${v} egenskaper`,
      toppN((r) => r.egenskaper, (r) => r.egenskaper >= 1),
    ),
    pakk(
      "vert",
      finn((r) => r.verter, (r) => r.verter >= 1),
      (v) => `${v} leker`,
      toppN((r) => r.verter, (r) => r.verter >= 1),
    ),
    pakk(
      "uheldig",
      finn((r) => r.sisteplasser, (r) => r.sisteplasser >= 1),
      (v) => `${v} sisteplasser`,
      toppN((r) => r.sisteplasser, (r) => r.sisteplasser >= 1),
    ),
    pakk(
      "trost",
      finn((r) => r.snitt, (r) => r.kamper >= 2, true),
      (v) => `${v.toFixed(1)} i snitt`,
      toppN((r) => r.snitt, (r) => r.kamper >= 2, true),
    ),
  ];
}
