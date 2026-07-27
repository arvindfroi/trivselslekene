"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import {
  bracketSlots,
  bracketSize,
  seedRekkefolge,
  type KampSlot,
  winnersRunder,
  losersRunder,
  wr1Par,
} from "@/lib/bracket";
import { standardPoengFor } from "@/lib/rangering";

type AdvanceTarget = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
  somDeltager: 1 | 2;
};

// ─── Advance-funksjoner (P = bracket-størrelse, 2-potens) ────────────────

function nesteKampForVinner(kamp: KampSlot, P: number): AdvanceTarget | null {
  const { bracket, runde, posisjon } = kamp;
  const WR = winnersRunder(P);
  const LR = losersRunder(P);

  if (bracket === "W") {
    if (runde === WR) {
      return { bracket: "G", runde: 1, posisjon: 1, somDeltager: 1 };
    }
    const nyPosisjon = Math.ceil(posisjon / 2);
    const somDeltager: 1 | 2 = posisjon % 2 === 1 ? 1 : 2;
    return { bracket: "W", runde: runde + 1, posisjon: nyPosisjon, somDeltager };
  }

  if (bracket === "L") {
    const isLastLR = runde === LR;
    const isOdd = runde % 2 === 1;

    if (isLastLR) {
      return { bracket: "G", runde: 1, posisjon: 1, somDeltager: 2 };
    }
    if (isOdd) {
      return { bracket: "L", runde: runde + 1, posisjon, somDeltager: 1 };
    }
    const nyPosisjon = Math.ceil(posisjon / 2);
    const somDeltager: 1 | 2 = posisjon % 2 === 1 ? 1 : 2;
    return { bracket: "L", runde: runde + 1, posisjon: nyPosisjon, somDeltager };
  }

  return null;
}

function nesteKampForTaper(kamp: KampSlot, P: number): AdvanceTarget | null {
  const { bracket, runde, posisjon } = kamp;
  const WR = winnersRunder(P);
  const LR = losersRunder(P);

  if (bracket !== "W") return null;

  if (runde === WR) {
    return { bracket: "L", runde: LR, posisjon: 1, somDeltager: 2 };
  }
  if (runde === 1) {
    const lrPosisjon = Math.ceil(posisjon / 2);
    const somDeltager: 1 | 2 = posisjon % 2 === 1 ? 1 : 2;
    return { bracket: "L", runde: 1, posisjon: lrPosisjon, somDeltager };
  }
  const lrRunde = 2 * runde - 2;
  return { bracket: "L", runde: lrRunde, posisjon, somDeltager: 2 };
}

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────

function krevInnlogget() {
  return auth().then((s) => {
    if (!s?.user?.id) redirect("/bli-med");
    return s.user;
  });
}

/** Deriver P (bracket-størrelse) fra antall WR1-kamper */
function PFromKamper(kamper: { bracket: string; runde: number }[]): number {
  return kamper.filter((k) => k.bracket === "W" && k.runde === 1).length * 2;
}

/**
 * Cascade fixup: etter WR1-behandling kan losers bracket ha slots med kun
 * én deltager (fordi WR1 bye-posisjoner ikke produserer tapere).
 * Auto-avanser solo-deltagere gjennom losers bracket.
 *
 * Regler for når en LR-slot auto-avanseres:
 * - LR1 (runde 1): alltid — tomme plasser skyldes WR1-byes
 * - Oddetallsrunder > 1 (3, 5, …): begge deltagere kommer fra forrige LR-runde,
 *   så hvis bare én er på plass og den andre aldri kommer → auto-avanser
 * - Partallsrunder (2, 4, …): D1 fra forrige LR, D2 fra WR. Ikke auto-avanser
 *   hvis D2 mangler — den kommer når WR-kampen avgjøres.
 * - Siste LR-runde: hvis den er partall, vent på WR-finaletaper.
 */
async function cascadeLosersBracket(turneringId: string, P: number) {
  const LR = losersRunder(P);

  // Hent ALLE LR-kamper på én gang — ingen re-fetching i løkka
  const lrKamper = await prisma.turneringsKamp.findMany({
    where: { turneringId, bracket: "L" },
    orderBy: [{ runde: "asc" }, { posisjon: "asc" }],
  });

  // Bygg lookup: runde -> kamper sortert på posisjon
  const byRunde = new Map<number, typeof lrKamper>();
  for (const k of lrKamper) {
    const arr = byRunde.get(k.runde) ?? [];
    arr.push(k);
    byRunde.set(k.runde, arr);
  }

  // Samle alle oppdateringer i én batch
  const kampOppdateringer: { id: string; vinnerId: string }[] = [];
  const plasseringer: { target: AdvanceTarget; deltagerId: string }[] = [];

  // Prosesser LR-runder i rekkefølge
  for (let r = 1; r <= LR; r++) {
    const kamper = byRunde.get(r);
    if (!kamper || kamper.length === 0) continue;
    kamper.sort((a, b) => a.posisjon - b.posisjon);

    const isEven = r % 2 === 0;

    for (const kamp of kamper) {
      const harD1 = !!kamp.deltager1Id;
      const harD2 = !!kamp.deltager2Id;

      if (harD1 && harD2) continue;
      if (kamp.status === "FULLFORT") continue;

      // Begge mangler — slot er dødt
      if (!harD1 && !harD2) continue;

      // For partallsrunder: hvis D1 finnes men D2 mangler, IKKE auto-avanser.
      if (isEven && harD1 && !harD2) continue;

      const soloId = harD1 ? kamp.deltager1Id! : kamp.deltager2Id!;

      kampOppdateringer.push({ id: kamp.id, vinnerId: soloId });

      const target = nesteKampForVinner(
        { bracket: "L", runde: kamp.runde, posisjon: kamp.posisjon },
        P,
      );
      if (target) {
        plasseringer.push({ target, deltagerId: soloId });
      }
    }
  }

  // Utfør alle kamp-oppdateringer i én batch
  if (kampOppdateringer.length > 0) {
    await prisma.$transaction(
      kampOppdateringer.map(({ id, vinnerId }) =>
        prisma.turneringsKamp.update({
          where: { id },
          data: { vinnerId, status: "FULLFORT" },
        }),
      ),
    );
  }

  // Plasser deltagere (med konflikt-sjekk) — batch per target
  if (plasseringer.length > 0) {
    await batchPlasserDeltagere(turneringId, plasseringer);
  }
}

// ─── Server actions ───────────────────────────────────────────────────────

export type OpprettTurneringInput = {
  navn: string;
  sesongId: string;
  vertId: string;
  /** Deltager-IDer i seed-rekkefølge (seed 1 først, seed N sist) */
  deltagerIder: string[];
  girPoeng?: boolean;
};

/** Oppretter turnering med alle bracket-slots og byes. Brukes både av
 *  server-action og av fullforOnboarding. */
export async function opprettTurneringData(input: OpprettTurneringInput) {
  const { navn, sesongId, vertId, deltagerIder, girPoeng = true } = input;
  const N = deltagerIder.length;
  const P = bracketSize(N);
  const slots = bracketSlots(P);

  // Opprett turnering med alle slots — inkluder relasjoner så vi slipper ekstra spørring
  const turnering = await prisma.turnering.create({
    data: {
      navn,
      sesongId,
      status: "PLANLAGT",
      girPoeng,
      deltagere: {
        create: deltagerIder.map((userId, i) => ({
          userId,
          seed: i + 1,
        })),
      },
      kamper: {
        create: slots.map((s) => ({
          bracket: s.bracket,
          runde: s.runde,
          posisjon: s.posisjon,
          status: "VENTER",
        })),
      },
    },
    include: { deltagere: true, kamper: true },
  });

  const deltagerMap = new Map(turnering.deltagere.map((d) => [d.seed, d.id]));
  const pSeeds = seedRekkefolge(P);

  // Samle bye-oppdateringer og plasseringer for batch
  const byeOppdateringer: { id: string; data: Record<string, unknown> }[] = [];
  const byePlasseringer: { target: AdvanceTarget; deltagerId: string }[] = [];
  const wr1Oppdateringer: { id: string; data: Record<string, unknown> }[] = [];

  // WR1-posisjoner: indeks 0,1 → posisjon 1; indeks 2,3 → posisjon 2; osv.
  for (let i = 0; i < pSeeds.length; i += 2) {
    const s1 = pSeeds[i];
    const s2 = pSeeds[i + 1];
    const wr1Pos = i / 2 + 1;

    const s1Real = s1 <= N;
    const s2Real = s2 <= N;

    const wr1Kamp = turnering.kamper.find(
      (k) => k.bracket === "W" && k.runde === 1 && k.posisjon === wr1Pos,
    );
    if (!wr1Kamp) continue;

    if (s1Real && !s2Real) {
      const dId = deltagerMap.get(s1);
      if (!dId) continue;
      byeOppdateringer.push({
        id: wr1Kamp.id,
        data: { deltager1Id: dId, vinnerId: dId, status: "FULLFORT" },
      });
      const target = nesteKampForVinner(
        { bracket: "W", runde: 1, posisjon: wr1Pos },
        P,
      );
      if (target) {
        byePlasseringer.push({ target, deltagerId: dId });
      }
    } else if (!s1Real && s2Real) {
      const dId = deltagerMap.get(s2);
      if (!dId) continue;
      byeOppdateringer.push({
        id: wr1Kamp.id,
        data: { deltager2Id: dId, vinnerId: dId, status: "FULLFORT" },
      });
      const target = nesteKampForVinner(
        { bracket: "W", runde: 1, posisjon: wr1Pos },
        P,
      );
      if (target) {
        byePlasseringer.push({ target, deltagerId: dId });
      }
    }
  }

  // Fyll inn faktiske WR1-kamper
  for (const [s1, s2, pos] of wr1Par(N)) {
    const d1 = deltagerMap.get(s1);
    const d2 = deltagerMap.get(s2);
    if (!d1 || !d2) continue;

    const kamp = turnering.kamper.find(
      (k) => k.bracket === "W" && k.runde === 1 && k.posisjon === pos,
    );
    if (!kamp) continue;

    wr1Oppdateringer.push({
      id: kamp.id,
      data: { deltager1Id: d1, deltager2Id: d2, status: "KLAR" },
    });
  }

  // Utfør alle WR1-oppdateringer i én batch
  const alleOppdateringer = [...byeOppdateringer, ...wr1Oppdateringer];
  if (alleOppdateringer.length > 0) {
    await prisma.$transaction(
      alleOppdateringer.map(({ id, data }) =>
        prisma.turneringsKamp.update({ where: { id }, data }),
      ),
    );
  }

  // Plasser bye-vinnere videre
  if (byePlasseringer.length > 0) {
    await batchPlasserDeltagere(turnering.id, byePlasseringer);
  }

  // Cascade fixup: auto-advance solo LR participants from WR1 bye gaps
  await cascadeLosersBracket(turnering.id, P);

  // Opprett Ovelse-rad så turneringen vises i øvelsesgridet
  await prisma.ovelse.create({
    data: {
      navn,
      type: "TURNERING",
      sesongId,
      vertId,
      turneringId: turnering.id,
    },
  });

  return turnering.id;
}

/**
 * Oppretter en ny turnering med valgfritt antall deltagere (3–64).
 * Ikke-2-potens antall håndteres med byes (walkover for toppseedene).
 */
export async function opprettTurnering(formData: FormData) {
  const bruker = await krevInnlogget();
  const sesong = await sikreAktivSesong();

  const navn = String(formData.get("navn") ?? "").trim();
  if (!navn) return;

  const antallStr = String(formData.get("antallDeltagere") ?? "8").trim();
  const N = parseInt(antallStr, 10);
  if (isNaN(N) || N < 3 || N > 64) return;

  const girPoeng = formData.get("girPoeng") !== "false";

  // Hent deltager-IDer i seed-rekkefølge (1..N)
  const deltagerIder: string[] = [];
  for (let i = 1; i <= N; i++) {
    const id = String(formData.get(`seed${i}`) ?? "").trim();
    if (!id) continue;
    if (deltagerIder.includes(id)) continue;
    deltagerIder.push(id);
  }
  if (deltagerIder.length !== N) return;

  const turneringId = await opprettTurneringData({
    navn,
    sesongId: sesong.id,
    vertId: bruker.id,
    deltagerIder,
    girPoeng,
  });
  if (!turneringId) return;

  revalidatePath("/turnering");
  revalidatePath("/ovelser");
  redirect("/turnering");
}

/**
 * Registrer vinner av en kamp. Flytter vinner og taper til neste kamp(er)
 * automatisk. Håndterer også reset-kamp i Grand Finals.
 */
export async function velgVinner(kampId: string, vinnerDeltagerId: string) {
  await krevInnlogget();

  const kamp = await prisma.turneringsKamp.findUnique({
    where: { id: kampId },
    include: { turnering: { include: { kamper: { select: { bracket: true, runde: true } } } } },
  });

  if (!kamp || kamp.status === "FULLFORT") return;
  if (kamp.turnering.status === "FULLFORT") return;
  if (!kamp.deltager1Id || !kamp.deltager2Id) return;

  if (vinnerDeltagerId !== kamp.deltager1Id && vinnerDeltagerId !== kamp.deltager2Id) return;

  const P = PFromKamper(kamp.turnering.kamper);

  const taperId =
    vinnerDeltagerId === kamp.deltager1Id ? kamp.deltager2Id : kamp.deltager1Id;

  // Kjør kamp-oppdatering og status-endring parallelt
  await Promise.all([
    prisma.turneringsKamp.update({
      where: { id: kampId },
      data: { vinnerId: vinnerDeltagerId, status: "FULLFORT" },
    }),
    kamp.turnering.status === "PLANLAGT"
      ? prisma.turnering.update({
          where: { id: kamp.turnering.id },
          data: { status: "PAAGAAR" },
        })
      : Promise.resolve(),
  ]);

  const detteSlot: KampSlot = {
    bracket: kamp.bracket as "W" | "L" | "G",
    runde: kamp.runde,
    posisjon: kamp.posisjon,
  };

  // Grand Finals — G-M1: hvis LB-vinner vinner → reset-kamp G-M2
  if (kamp.bracket === "G" && kamp.runde === 1) {
    if (vinnerDeltagerId === kamp.deltager2Id) {
      await prisma.turneringsKamp.create({
        data: {
          turneringId: kamp.turneringId,
          bracket: "G",
          runde: 2,
          posisjon: 1,
          status: "KLAR",
          deltager1Id: kamp.deltager1Id,
          deltager2Id: kamp.deltager2Id,
        },
      });
    } else {
      await prisma.turnering.update({
        where: { id: kamp.turnering.id },
        data: { status: "FULLFORT" },
      });
      await fullforTurnering(kamp.turneringId);
    }
    revalidatePath("/turnering");
    return;
  }

  // G-M2: vinneren vinner hele turneringen
  if (kamp.bracket === "G" && kamp.runde === 2) {
    await prisma.turnering.update({
      where: { id: kamp.turnering.id },
      data: { status: "FULLFORT" },
    });
    await fullforTurnering(kamp.turneringId);
    revalidatePath("/turnering");
    return;
  }

  // Bygg plasseringsliste: vinner + taper i én batch
  const plasseringer: { target: AdvanceTarget; deltagerId: string }[] = [];

  const vinnerMål = nesteKampForVinner(detteSlot, P);
  if (vinnerMål) {
    plasseringer.push({ target: vinnerMål, deltagerId: vinnerDeltagerId });
  }

  const taperMål = nesteKampForTaper(detteSlot, P);
  if (taperMål) {
    plasseringer.push({ target: taperMål, deltagerId: taperId! });
  }

  if (plasseringer.length > 0) {
    await batchPlasserDeltagere(kamp.turneringId, plasseringer);
  }

  // Cascade fixup: WR-taper kan etterlate LR-slots med kun én deltager
  // hvis den tilhørende WR1-posisjonen var en bye.
  if (kamp.bracket === "W") {
    await cascadeLosersBracket(kamp.turneringId, P);
  }

  revalidatePath("/turnering");
  revalidatePath("/ovelser");
}

/**
 * Utfører alle plasseringer i én transaksjon: henter alle mål-kamper i én query,
 * sjekker konflikter i minnet, og utfører alle oppdateringer samlet.
 */
async function batchPlasserDeltagere(
  turneringId: string,
  plasseringer: { target: AdvanceTarget; deltagerId: string }[],
) {
  if (plasseringer.length === 0) return;

  // Dedup: siste plassering for hver (bracket, runde, posisjon, somDeltager) vinner
  const deduped = new Map<string, { target: AdvanceTarget; deltagerId: string }>();
  for (const p of plasseringer) {
    const key = `${p.target.bracket}-${p.target.runde}-${p.target.posisjon}-${p.target.somDeltager}`;
    deduped.set(key, p);
  }

  // Hent alle relevante kamper i én query
  // (henter alle for turneringen og filtrerer i minnet siden Prisma ikke
  //  støtter vilkårlig OR på tvers av ulike felter)
  const unike = [...deduped.values()];
  const alleRelevante = await prisma.turneringsKamp.findMany({
    where: {
      turneringId,
      bracket: { in: ["W", "L", "G"] },
    },
    select: { id: true, bracket: true, runde: true, posisjon: true, deltager1Id: true, deltager2Id: true },
  });

  const kampBySlot = new Map<string, typeof alleRelevante[number]>();
  for (const k of alleRelevante) {
    kampBySlot.set(`${k.bracket}-${k.runde}-${k.posisjon}`, k);
  }

  // Bygg oppdateringer
  const updates: { id: string; data: Record<string, string | null> }[] = [];

  for (const { target, deltagerId } of unike) {
    const kamp = kampBySlot.get(`${target.bracket}-${target.runde}-${target.posisjon}`);
    if (!kamp) continue;

    const erDeltager1 = target.somDeltager === 1;
    const eksisterende = erDeltager1 ? kamp.deltager1Id : kamp.deltager2Id;

    if (eksisterende && eksisterende !== deltagerId) {
      console.error(
        `[batchPlasserDeltagere] KONFLIKT: Prøvde å plassere ${deltagerId} i ${target.bracket}-${target.runde}-${target.posisjon} som D${target.somDeltager}, men ${eksisterende} er allerede der. Hopper over.`,
      );
      continue;
    }

    if (eksisterende === deltagerId) continue;

    const annenErSatt = erDeltager1 ? !!kamp.deltager2Id : !!kamp.deltager1Id;

    updates.push({
      id: kamp.id,
      data: {
        [erDeltager1 ? "deltager1Id" : "deltager2Id"]: deltagerId,
        status: annenErSatt ? "KLAR" : "VENTER",
      },
    });
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map(({ id, data }) =>
        prisma.turneringsKamp.update({ where: { id }, data }),
      ),
    );
  }
}

/**
 * Beregn plassering og poeng for alle deltagere når en turnering fullføres.
 * Oppretter ResultatIndividuell-rader knyttet til turneringens Ovelse slik
 * at poengene teller med i stillingen.
 */
async function fullforTurnering(turneringId: string) {
  const turnering = await prisma.turnering.findUnique({
    where: { id: turneringId },
    select: {
      girPoeng: true,
      deltagere: { include: { user: true } },
      kamper: { where: { status: "FULLFORT" } },
      ovelse: { select: { id: true } },
    },
  });

  if (!turnering || !turnering.ovelse) return;

  const { deltagere, kamper, ovelse } = turnering;
  const N = deltagere.length;
  const P = bracketSize(N);
  const LR = losersRunder(P);

  // ─── Bygg statistikk per deltager ───────────────────────────────────

  type Stat = {
    turneringsDeltagerId: string;
    userId: string;
    seed: number;
    seire: number;
    maksWRRunde: number;
    maksLRRunde: number;
    tapteLBFinale: boolean; // tapte siste LB-runde (LR)
  };

  const statsMap = new Map<string, Stat>();

  for (const d of deltagere) {
    statsMap.set(d.id, {
      turneringsDeltagerId: d.id,
      userId: d.userId,
      seed: d.seed,
      seire: 0,
      maksWRRunde: 0,
      maksLRRunde: 0,
      tapteLBFinale: false,
    });
  }

  for (const k of kamper) {
    const vinner = k.vinnerId ? statsMap.get(k.vinnerId) : undefined;
    const d1 = k.deltager1Id ? statsMap.get(k.deltager1Id) : undefined;
    const d2 = k.deltager2Id ? statsMap.get(k.deltager2Id) : undefined;

    if (vinner) vinner.seire++;

    for (const s of [d1, d2]) {
      if (!s) continue;
      if (k.bracket === "W") s.maksWRRunde = Math.max(s.maksWRRunde, k.runde);
      if (k.bracket === "L") s.maksLRRunde = Math.max(s.maksLRRunde, k.runde);
    }

    // LB finale: siste LB-runde — taperen får 3. plass
    if (k.bracket === "L" && k.runde === LR) {
      const taperId = k.vinnerId === k.deltager1Id ? k.deltager2Id : k.deltager1Id;
      const taper = taperId ? statsMap.get(taperId) : undefined;
      if (taper) taper.tapteLBFinale = true;
    }
  }

  // ─── Finn mester og runner-up ──────────────────────────────────────

  const gfKamper = kamper.filter((k) => k.bracket === "G");
  const sisteGF = gfKamper.sort((a, b) => b.runde - a.runde)[0];
  const championId = sisteGF?.vinnerId ?? undefined;

  // Runner-up: den andre deltageren i siste GF-kamp
  let runnerUpId: string | undefined;
  if (sisteGF) {
    runnerUpId =
      sisteGF.vinnerId === sisteGF.deltager1Id
        ? sisteGF.deltager2Id ?? undefined
        : sisteGF.deltager1Id ?? undefined;
  }

  // ─── Sorter etter plassering ───────────────────────────────────────

  const resultater = [...statsMap.values()];

  resultater.sort((a, b) => {
    // 1. Mester
    const aChamp = a.turneringsDeltagerId === championId ? 1 : 0;
    const bChamp = b.turneringsDeltagerId === championId ? 1 : 0;
    if (aChamp !== bChamp) return bChamp - aChamp;

    // 2. Runner-up (tapte GF)
    const aRU = a.turneringsDeltagerId === runnerUpId ? 1 : 0;
    const bRU = b.turneringsDeltagerId === runnerUpId ? 1 : 0;
    if (aRU !== bRU) return bRU - aRU;

    // 3. Tapte LB-finale
    if (a.tapteLBFinale !== b.tapteLBFinale) return (b.tapteLBFinale ? 1 : 0) - (a.tapteLBFinale ? 1 : 0);

    // 4. Høyest LB-runde
    if (a.maksLRRunde !== b.maksLRRunde) return b.maksLRRunde - a.maksLRRunde;

    // 5. Høyest WB-runde
    if (a.maksWRRunde !== b.maksWRRunde) return b.maksWRRunde - a.maksWRRunde;

    // 6. Flest seire
    if (a.seire !== b.seire) return b.seire - a.seire;

    // 7. Seed (lavere = bedre)
    return a.seed - b.seed;
  });

  // ─── Lagre resultater ──────────────────────────────────────────────

  const ovelseId = ovelse.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transaksjon: any[] = [];

  // Hvis turneringen gir poeng: slett gamle og opprett nye ResultatIndividuell
  if (turnering.girPoeng) {
    transaksjon.push(
      prisma.resultatIndividuell.deleteMany({ where: { ovelseId } }),
      ...resultater.map((r, i) => {
        const plassering = i + 1;
        const poeng = standardPoengFor(plassering);
        return prisma.resultatIndividuell.create({
          data: {
            ovelseId,
            userId: r.userId,
            plassering,
            poeng,
          },
        });
      }),
    );
  }

  // Marker øvelsen som FULLFORT uansett
  transaksjon.push(
    prisma.ovelse.update({
      where: { id: ovelseId },
      data: { status: "FULLFORT" },
    }),
  );

  await prisma.$transaction(transaksjon);

  revalidatePath("/turnering");
  revalidatePath("/ovelser");
  revalidatePath("/stilling");
  revalidatePath("/dashboard");
}

/** Sletter ResultatIndividuell for en turnerings tilknyttede øvelse, og
 *  toggler girPoeng-flagget. Kalles når en turnering settes til «gir ikke poeng».
 */
export async function toggleGirPoeng(turneringId: string) {
  await krevInnlogget();
  const t = await prisma.turnering.findUnique({
    where: { id: turneringId },
    select: { girPoeng: true, ovelse: { select: { id: true } } },
  });
  if (!t) return;

  const ny = !t.girPoeng;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operasjoner: any[] = [
    prisma.turnering.update({ where: { id: turneringId }, data: { girPoeng: ny } }),
  ];

  // Hvis vi skrur AV poeng: slett eventuelle ResultatIndividuell-rader
  if (!ny && t.ovelse) {
    operasjoner.push(
      prisma.resultatIndividuell.deleteMany({
        where: { ovelseId: t.ovelse.id },
      }),
    );
  }

  await prisma.$transaction(operasjoner);

  revalidatePath("/turnering");
  revalidatePath("/stilling");
  revalidatePath("/dashboard");
}

/** Slett en turnering og dens tilknyttede øvelse (kun PLANLAGT og PAAGAAR) */
export async function slettTurnering(turneringId: string) {
  await krevInnlogget();
  const t = await prisma.turnering.findUnique({ where: { id: turneringId } });
  if (!t || t.status === "FULLFORT") return;

  // Slett tilknyttet Ovelse-rad først (foreign key constraint)
  await prisma.ovelse.deleteMany({ where: { turneringId } });

  await prisma.turnering.delete({ where: { id: turneringId } });
  revalidatePath("/turnering");
  revalidatePath("/ovelser");
  redirect("/turnering");
}
