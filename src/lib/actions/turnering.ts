"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";

// ─── Bracket-generator for 8 deltagere (dobbel-eliminering) ───────────────

type KampSlot = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
};

/**
 * Returnerer alle kamp-slottene for en 8-spillers dobbel-eliminering.
 * "G" = Grand Finals (med potensiell reset-kamp).
 */
function bracketSlots(): KampSlot[] {
  const slots: KampSlot[] = [];

  // Winners bracket
  for (let r = 1; r <= 3; r++) {
    const antall = Math.pow(2, 3 - r); // 4, 2, 1
    for (let p = 1; p <= antall; p++) {
      slots.push({ bracket: "W", runde: r, posisjon: p });
    }
  }

  // Losers bracket
  // LR1: 2 matches (losers from WR1)
  // LR2: 2 matches (winners of LR1 vs losers from WR2)
  // LR3: 1 match  (winners of LR2)
  // LR4: 1 match  (winner of LR3 vs loser of WF/WR3)
  slots.push({ bracket: "L", runde: 1, posisjon: 1 });
  slots.push({ bracket: "L", runde: 1, posisjon: 2 });
  slots.push({ bracket: "L", runde: 2, posisjon: 1 });
  slots.push({ bracket: "L", runde: 2, posisjon: 2 });
  slots.push({ bracket: "L", runde: 3, posisjon: 1 });
  slots.push({ bracket: "L", runde: 4, posisjon: 1 });

  // Grand Finals (1 match, reset legges til dynamisk ved behov)
  slots.push({ bracket: "G", runde: 1, posisjon: 1 });

  return slots;
}

type AdvanceTarget = {
  bracket: "W" | "L" | "G";
  runde: number;
  posisjon: number;
  somDeltager: 1 | 2;
};

/**
 * For en gitt kamp, finner vi hvor vinneren og taperen skal plasseres.
 * Returnerer null hvis deltageren er ute av turneringen.
 */
function nesteKampForVinner(kamp: KampSlot): AdvanceTarget | null {
  const { bracket, runde, posisjon } = kamp;

  if (bracket === "W") {
    if (runde === 3) {
      // Vinner av winners bracket → Grand Finals deltager 1
      return { bracket: "G", runde: 1, posisjon: 1, somDeltager: 1 };
    }
    // WR1/WR2: vinneren går videre i winners
    const nyPosisjon = Math.ceil(posisjon / 2);
    const somDeltager: 1 | 2 = posisjon % 2 === 1 ? 1 : 2;
    return { bracket: "W", runde: runde + 1, posisjon: nyPosisjon, somDeltager };
  }

  if (bracket === "L") {
    if (runde === 4) {
      // Vinner av losers bracket → Grand Finals deltager 2
      return { bracket: "G", runde: 1, posisjon: 1, somDeltager: 2 };
    }
    if (runde === 3) {
      // LR3 → LR4 (deltager 1)
      return { bracket: "L", runde: 4, posisjon: 1, somDeltager: 1 };
    }
    // LR1/LR2 → neste losers-runde
    const nyPosisjon = Math.ceil(posisjon / 2);
    const somDeltager: 1 | 2 = posisjon % 2 === 1 ? 1 : 2;
    return { bracket: "L", runde: runde + 1, posisjon: nyPosisjon, somDeltager };
  }

  // G: vinneren har vunnet turneringen (ingen neste kamp)
  return null;
}

function nesteKampForTaper(kamp: KampSlot): AdvanceTarget | null {
  const { bracket, runde, posisjon } = kamp;

  if (bracket === "W") {
    if (runde === 3) {
      // Taper av winners finals → LR4 (deltager 2)
      return { bracket: "L", runde: 4, posisjon: 1, somDeltager: 2 };
    }
    // Taper av WR1/WR2 → losers bracket
    // WR1: pos 1→LR1-1(d1), pos 2→LR1-1(d2), pos 3→LR1-2(d1), pos 4→LR1-2(d2)
    // WR2: pos 1→LR2-1(d2), pos 2→LR2-2(d2)
    if (runde === 1) {
      const lrPosisjon = Math.ceil(posisjon / 2);
      const somDeltager: 1 | 2 = posisjon % 2 === 1 ? 1 : 2;
      return { bracket: "L", runde: 1, posisjon: lrPosisjon, somDeltager };
    }
    if (runde === 2) {
      return { bracket: "L", runde: 2, posisjon, somDeltager: 2 };
    }
  }

  if (bracket === "L") {
    // Taper i losers bracket = ute
    return null;
  }

  if (bracket === "G") {
    // G-M1: hvis deltager 2 (LB-vinner) vinner → reset-kamp G-M2
    // (håndteres spesielt i velgVinner)
    return null;
  }

  return null;
}

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────

function krevInnlogget() {
  return auth().then((s) => {
    if (!s?.user?.id) redirect("/bli-med");
    return s.user;
  });
}

// ─── Server actions ───────────────────────────────────────────────────────

/**
 * Oppretter en ny turnering med 8 deltagere (seed 1–8).
 * Deltagerne tas fra topp 8 på stillingen hvis ingen spesifiseres.
 */
export async function opprettTurnering(formData: FormData) {
  await krevInnlogget();
  const sesong = await sikreAktivSesong();

  const navn = String(formData.get("navn") ?? "").trim();
  if (!navn) return;

  // Hent deltager-IDer (8 stk, i seed-rekkefølge 1–8)
  const deltagerIder: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const id = String(formData.get(`seed${i}`) ?? "").trim();
    if (!id) continue;
    if (deltagerIder.includes(id)) continue;
    deltagerIder.push(id);
  }

  if (deltagerIder.length !== 8) return;

  const slots = bracketSlots();

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

  // Plasser seeds i WR1: seed 1v8, 4v5, 3v6, 2v7
  const turnering = await prisma.turnering.findFirst({
    where: { sesongId: sesong.id, navn },
    include: { deltagere: true, kamper: true },
    orderBy: { createdAt: "desc" },
  });

  if (!turnering) return;

  const deltagerMap = new Map(turnering.deltagere.map((d) => [d.seed, d.id]));

  // WR1 paringer: [ [seedA, seedB, posisjon], ... ]
  const wr1Par: [number, number, number][] = [
    [1, 8, 1],
    [4, 5, 2],
    [3, 6, 3],
    [2, 7, 4],
  ];

  for (const [s1, s2, pos] of wr1Par) {
    const d1 = deltagerMap.get(s1);
    const d2 = deltagerMap.get(s2);
    if (!d1 || !d2) continue;

    const kamp = turnering.kamper.find(
      (k) => k.bracket === "W" && k.runde === 1 && k.posisjon === pos
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
    include: { turnering: true },
  });

  if (!kamp || kamp.status === "FULLFORT") return;
  if (kamp.turnering.status === "FULLFORT") return;
  if (!kamp.deltager1Id || !kamp.deltager2Id) return;

  // Valider at vinneren faktisk er en av deltagerne
  if (vinnerDeltagerId !== kamp.deltager1Id && vinnerDeltagerId !== kamp.deltager2Id) return;

  const taperId =
    vinnerDeltagerId === kamp.deltager1Id ? kamp.deltager2Id : kamp.deltager1Id;

  // Oppdater kampen
  await prisma.turneringsKamp.update({
    where: { id: kampId },
    data: { vinnerId: vinnerDeltagerId, status: "FULLFORT" },
  });

  // Sett turnering til PAAGAAR hvis den er PLANLAGT
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

  // Spesialhåndtering for Grand Finals
  if (kamp.bracket === "G" && kamp.posisjon === 1) {
    // Hent deltagerne for å vite hvem som er WB-vinner og LB-vinner
    // I G-M1 er deltager1 WB-vinner, deltager2 LB-vinner
    if (vinnerDeltagerId === kamp.deltager2Id) {
      // LB-vinner vant → opprett reset-kamp G-M2
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
      // WB-vinner vant → turnering ferdig
      await prisma.turnering.update({
        where: { id: kamp.turnering.id },
        data: { status: "FULLFORT" },
      });
    }
    revalidatePath("/turnering");
    return;
  }

  // Håndter reset-kamp (G-M2) — vinneren vinner hele turneringen
  if (kamp.bracket === "G" && kamp.posisjon === 1 && kamp.runde === 2) {
    await prisma.turnering.update({
      where: { id: kamp.turnering.id },
      data: { status: "FULLFORT" },
    });
    revalidatePath("/turnering");
    return;
  }

  // Flytt vinner videre
  const vinnerMål = nesteKampForVinner(detteSlot);
  if (vinnerMål) {
    await plasserDeltager(kamp.turneringId, vinnerMål, vinnerDeltagerId);
  }

  // Flytt taper til losers bracket
  const taperMål = nesteKampForTaper(detteSlot);
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
  });

  if (!kamp) return;

  const data: Record<string, string> = {};
  if (target.somDeltager === 1) {
    data.deltager1Id = deltagerId;
  } else {
    data.deltager2Id = deltagerId;
  }

  await prisma.turneringsKamp.update({
    where: { id: kamp.id },
    data: {
      ...data,
      status: kamp.deltager1Id || kamp.deltager2Id ? "KLAR" : kamp.status,
    },
  });

  // Etter oppdatering: sjekk om begge deltagere er på plass → sett KLAR
  const oppdatert = await prisma.turneringsKamp.findUnique({
    where: { id: kamp.id },
  });
  if (oppdatert?.deltager1Id && oppdatert?.deltager2Id && oppdatert.status !== "FULLFORT") {
    await prisma.turneringsKamp.update({
      where: { id: kamp.id },
      data: { status: "KLAR" },
    });
  }
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
