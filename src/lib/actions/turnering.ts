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

// ─── Server actions ───────────────────────────────────────────────────────

/**
 * Oppretter en ny turnering med valgfritt antall deltagere (3–64).
 * Ikke-2-potens antall håndteres med byes (walkover for toppseedene).
 */
export async function opprettTurnering(formData: FormData) {
  await krevInnlogget();
  const sesong = await sikreAktivSesong();

  const navn = String(formData.get("navn") ?? "").trim();
  if (!navn) return;

  const antallStr = String(formData.get("antallDeltagere") ?? "8").trim();
  const N = parseInt(antallStr, 10);
  if (isNaN(N) || N < 3 || N > 64) return;

  const P = bracketSize(N);

  // Hent deltager-IDer i seed-rekkefølge (1..N)
  const deltagerIder: string[] = [];
  for (let i = 1; i <= N; i++) {
    const id = String(formData.get(`seed${i}`) ?? "").trim();
    if (!id) continue;
    if (deltagerIder.includes(id)) continue;
    deltagerIder.push(id);
  }
  if (deltagerIder.length !== N) return;

  const slots = bracketSlots(P);

  // Opprett turnering med alle slots
  await prisma.turnering.create({
    data: {
      navn,
      sesongId: sesong.id,
      status: "PLANLAGT",
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
  });

  const turnering = await prisma.turnering.findFirst({
    where: { sesongId: sesong.id, navn },
    include: { deltagere: true, kamper: true },
    orderBy: { createdAt: "desc" },
  });
  if (!turnering) return;

  const deltagerMap = new Map(turnering.deltagere.map((d) => [d.seed, d.id]));
  const pSeeds = seedRekkefolge(P);

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
      // Bye for s1
      const dId = deltagerMap.get(s1);
      if (!dId) continue;
      await prisma.turneringsKamp.update({
        where: { id: wr1Kamp.id },
        data: { deltager1Id: dId, vinnerId: dId, status: "FULLFORT" },
      });
      // Avanser vinneren til WR2
      const target = nesteKampForVinner(
        { bracket: "W", runde: 1, posisjon: wr1Pos },
        P,
      );
      if (target) {
        await plasserDeltager(turnering.id, target, dId);
      }
    } else if (!s1Real && s2Real) {
      // Bye for s2
      const dId = deltagerMap.get(s2);
      if (!dId) continue;
      await prisma.turneringsKamp.update({
        where: { id: wr1Kamp.id },
        data: { deltager2Id: dId, vinnerId: dId, status: "FULLFORT" },
      });
      const target = nesteKampForVinner(
        { bracket: "W", runde: 1, posisjon: wr1Pos },
        P,
      );
      if (target) {
        await plasserDeltager(turnering.id, target, dId);
      }
    }
    // s1Real && s2Real: faktisk kamp — håndteres av wr1Par nedenfor
  }

  // 2. Fyll inn faktiske WR1-kamper
  for (const [s1, s2, pos] of wr1Par(N)) {
    const d1 = deltagerMap.get(s1);
    const d2 = deltagerMap.get(s2);
    if (!d1 || !d2) continue;

    const kamp = turnering.kamper.find(
      (k) => k.bracket === "W" && k.runde === 1 && k.posisjon === pos,
    );
    if (!kamp) continue;

    await prisma.turneringsKamp.update({
      where: { id: kamp.id },
      data: { deltager1Id: d1, deltager2Id: d2, status: "KLAR" },
    });
  }

  revalidatePath("/turnering");
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

  await prisma.turneringsKamp.update({
    where: { id: kampId },
    data: { vinnerId: vinnerDeltagerId, status: "FULLFORT" },
  });

  if (kamp.turnering.status === "PLANLAGT") {
    await prisma.turnering.update({
      where: { id: kamp.turnering.id },
      data: { status: "PAAGAAR" },
    });
  }

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
    revalidatePath("/turnering");
    return;
  }

  // Flytt vinner videre
  const vinnerMål = nesteKampForVinner(detteSlot, P);
  if (vinnerMål) {
    await plasserDeltager(kamp.turneringId, vinnerMål, vinnerDeltagerId);
  }

  // Flytt taper til losers bracket
  const taperMål = nesteKampForTaper(detteSlot, P);
  if (taperMål) {
    await plasserDeltager(kamp.turneringId, taperMål, taperId!);
  }

  revalidatePath("/turnering");
}

async function plasserDeltager(
  turneringId: string,
  target: AdvanceTarget,
  deltagerId: string,
) {
  const kamp = await prisma.turneringsKamp.findFirst({
    where: {
      turneringId,
      bracket: target.bracket,
      runde: target.runde,
      posisjon: target.posisjon,
    },
    select: { id: true, deltager1Id: true, deltager2Id: true },
  });

  if (!kamp) return;

  const erDeltager1 = target.somDeltager === 1;
  const annenErSatt = erDeltager1 ? !!kamp.deltager2Id : !!kamp.deltager1Id;

  await prisma.turneringsKamp.update({
    where: { id: kamp.id },
    data: {
      [erDeltager1 ? "deltager1Id" : "deltager2Id"]: deltagerId,
      status: annenErSatt ? "KLAR" : "VENTER",
    },
  });
}

/** Slett en turnering (bare hvis PLANLAGT) */
export async function slettTurnering(turneringId: string) {
  await krevInnlogget();
  const t = await prisma.turnering.findUnique({ where: { id: turneringId } });
  if (!t || t.status !== "PLANLAGT") return;
  await prisma.turnering.delete({ where: { id: turneringId } });
  revalidatePath("/turnering");
  redirect("/turnering");
}
