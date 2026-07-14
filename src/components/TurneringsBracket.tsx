"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Badge from "@/components/ui/Badge";
import { velgVinner } from "@/lib/actions/turnering";
import { expectedSeedMap, winnersRunder, losersRunder } from "@/lib/bracket";
import { Trophy, ChevronRight } from "lucide-react";

export type TurneringMedData = {
  id: string;
  navn: string;
  status: string;
  deltagere: {
    id: string;
    seed: number;
    user: { id: string; navn: string; bildeUrl: string | null };
  }[];
  kamper: {
    id: string;
    bracket: string;
    runde: number;
    posisjon: number;
    deltager1Id: string | null;
    deltager2Id: string | null;
    vinnerId: string | null;
    status: string;
    deltager1: { id: string; seed: number; user: { id: string; navn: string; bildeUrl: string | null } } | null;
    deltager2: { id: string; seed: number; user: { id: string; navn: string; bildeUrl: string | null } } | null;
  }[];
};

// ─── Hjelpefunksjoner ────────────────────────────────────────────────────

function gapForMatchCount(count: number): string {
  if (count >= 8) return "0.25rem";
  if (count >= 4) return "0.5rem";
  if (count >= 2) return "1.5rem";
  return "1.5rem";
}

function PFromKamper(kamper: TurneringMedData["kamper"]): number {
  return kamper.filter((k) => k.bracket === "W" && k.runde === 1).length * 2;
}

// ─── DeltagerLinje ───────────────────────────────────────────────────────

function DeltagerLinje({
  deltager,
  erVinner,
  erTaper,
  onClick,
  kanKlikke,
  forventetNavn,
}: {
  deltager: { user: { navn: string; bildeUrl: string | null } } | null;
  erVinner: boolean;
  erTaper: boolean;
  onClick?: () => void;
  kanKlikke: boolean;
  forventetNavn?: string | null;
}) {
  if (!deltager) {
    if (forventetNavn) {
      return (
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-fg-faint/40 italic">
          {forventetNavn}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-fg-faint italic">
        TBD
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={!kanKlikke}
        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-md w-full transition-colors ${
          erVinner
            ? "bg-accent-2/15 text-accent-2 font-semibold"
            : erTaper
              ? "text-fg-faint line-through"
              : kanKlikke
                ? "hover:bg-white/[0.06] text-fg cursor-pointer"
                : "text-fg cursor-default"
        }`}
      >
        <Avatar navn={deltager.user.navn} bildeUrl={deltager.user.bildeUrl} size={20} />
        <span className="truncate">{deltager.user.navn}</span>
        {erVinner && <Trophy size={12} className="ml-auto shrink-0" />}
      </button>
      {forventetNavn && forventetNavn !== deltager.user.navn && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fg-faint/25 italic pointer-events-none">
          ({forventetNavn})
        </span>
      )}
    </div>
  );
}

// ─── KampKort ────────────────────────────────────────────────────────────

function KampKort({
  kamp,
  turneringStatus,
  forventetD1,
  forventetD2,
}: {
  kamp: TurneringMedData["kamper"][number];
  turneringStatus: string;
  forventetD1: string | null;
  forventetD2: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistiskVinner, setOptimistiskVinner] = useState<string | null>(null);
  const prevStatusRef = useRef(kamp.status);

  useEffect(() => {
    if (kamp.status === "FULLFORT" && prevStatusRef.current !== "FULLFORT") {
      setOptimistiskVinner(null);
    }
    prevStatusRef.current = kamp.status;
  }, [kamp.status]);

  const erFerdigFaktisk = kamp.status === "FULLFORT";
  const erFerdig = erFerdigFaktisk || optimistiskVinner !== null;
  const erKlar = kamp.status === "KLAR";
  const kanKlikke = erKlar && turneringStatus !== "FULLFORT" && !isPending;

  const erD1Vinner = erFerdig && (
    (erFerdigFaktisk && kamp.vinnerId === kamp.deltager1Id) ||
    optimistiskVinner === kamp.deltager1Id
  );
  const erD2Vinner = erFerdig && (
    (erFerdigFaktisk && kamp.vinnerId === kamp.deltager2Id) ||
    optimistiskVinner === kamp.deltager2Id
  );

  function handleVelgVinner(deltagerId: string) {
    if (isPending) return;
    setOptimistiskVinner(deltagerId);
    startTransition(async () => {
      await velgVinner(kamp.id, deltagerId);
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-lg border px-2 py-1.5 min-w-[140px] transition-opacity ${
        isPending ? "opacity-70" : ""
      } ${
        erFerdigFaktisk
          ? "border-accent-2/30 bg-accent-2/[0.04]"
          : erKlar
            ? "border-line-strong bg-white/[0.03]"
            : "border-line bg-transparent"
      }`}
    >
      <DeltagerLinje
        deltager={kamp.deltager1}
        erVinner={erD1Vinner}
        erTaper={erFerdig && !erD1Vinner}
        onClick={kanKlikke ? () => handleVelgVinner(kamp.deltager1Id!) : undefined}
        kanKlikke={kanKlikke}
        forventetNavn={forventetD1}
      />
      <div className="mx-2 my-0.5 border-t border-line" />
      <DeltagerLinje
        deltager={kamp.deltager2}
        erVinner={erD2Vinner}
        erTaper={erFerdig && !erD2Vinner}
        onClick={kanKlikke ? () => handleVelgVinner(kamp.deltager2Id!) : undefined}
        kanKlikke={kanKlikke}
        forventetNavn={forventetD2}
      />
    </div>
  );
}

// ─── Kolonne med kamper ──────────────────────────────────────────────────

type RoundGroup = {
  label: string;
  bracket: "W" | "L" | "G";
  runder: number[];
  kamper: TurneringMedData["kamper"][number][];
};

function BracketKolonne({
  groups,
  turneringStatus,
  forventetPerKamp,
  visSeeding,
}: {
  groups: RoundGroup[];
  turneringStatus: string;
  forventetPerKamp: Map<string, { d1: string | null; d2: string | null }>;
  visSeeding: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 shrink-0">
      {groups.map((group) => {
        // Group matches by round within the column
        const byRunde = new Map<number, typeof group.kamper>();
        for (const k of group.kamper) {
          const arr = byRunde.get(k.runde) ?? [];
          arr.push(k);
          byRunde.set(k.runde, arr);
        }

        const sorterteRunder = [...byRunde.keys()].sort((a, b) => a - b);

        return (
          <div key={group.label} className="flex flex-col gap-3">
            <div className="text-center">
              <Badge
                variant={
                  group.bracket === "W" ? "pagaar"
                  : group.bracket === "G" ? "gold"
                  : "neutral"
                }
              >
                {group.label}
              </Badge>
            </div>
            {sorterteRunder.map((runde) => {
              const kamper = byRunde.get(runde)!.sort((a, b) => a.posisjon - b.posisjon);
              return (
                <div
                  key={`${group.label}-${runde}`}
                  className="flex flex-col"
                  style={{ gap: gapForMatchCount(kamper.length) }}
                >
                  {kamper.map((kamp) => (
                    <KampKort
                      key={kamp.id}
                      kamp={kamp}
                      turneringStatus={turneringStatus}
                      forventetD1={visSeeding ? forventetPerKamp.get(kamp.id)?.d1 ?? null : null}
                      forventetD2={visSeeding ? forventetPerKamp.get(kamp.id)?.d2 ?? null : null}
                    />
                  ))}
                </div>
              );
            })}

            {/* Connector arrow after this group (unless it's the last in column) */}
            {/* Group-to-group connectors are shown in the column layout below */}
          </div>
        );
      })}
    </div>
  );
}

// ─── Connector-pil mellom kolonner ───────────────────────────────────────

function KolonnePil() {
  return (
    <div className="flex items-center shrink-0 px-0.5">
      <ChevronRight size={16} className="text-fg-faint" />
    </div>
  );
}

// ─── Hovedkomponent ──────────────────────────────────────────────────────

export default function TurneringsBracket({ turnering }: { turnering: TurneringMedData }) {
  const { kamper, deltagere } = turnering;
  const [visSeeding, setVisSeeding] = useState(false);

  const P = PFromKamper(kamper);
  const N = deltagere.length;
  const WR = winnersRunder(P);
  const LR = losersRunder(P);

  // Build seed → navn lookup
  const seedNavn = new Map<number, string>();
  for (const d of deltagere) {
    seedNavn.set(d.seed, d.user.navn);
  }

  // Expected seeds
  const seedMap = P >= 4 ? expectedSeedMap(P, N) : null;
  const forventetPerKamp = new Map<string, { d1: string | null; d2: string | null }>();
  if (seedMap) {
    for (const kamp of kamper) {
      const slotKey = `${kamp.bracket}-${kamp.runde}-${kamp.posisjon}`;
      const expected = seedMap.get(slotKey);
      const d1Navn = expected?.d1 != null ? seedNavn.get(expected.d1) ?? null : null;
      const d2Navn = expected?.d2 != null ? seedNavn.get(expected.d2) ?? null : null;
      forventetPerKamp.set(kamp.id, { d1: d1Navn, d2: d2Navn });
    }
  }

  // ─── Bygg kolonner: interleaved WR og LR ─────────────────────────────

  // Hjelper: hent kamper for en spesifikk bracket+runde
  const kamperFor = (bracket: string, runde: number) =>
    kamper.filter((k) => k.bracket === bracket && k.runde === runde);

  // Bygg kolonne-liste
  // Mønster: WR1 → LR1 → WR2 → LR2+LR3 → WR3 → LR4+LR5 → ... → WR(W) → LR(LR)+GF
  const columns: { groups: RoundGroup[] }[] = [];

  // WR1
  columns.push({
    groups: [{ label: "Runde 1", bracket: "W" as const, runder: [1], kamper: kamperFor("W", 1) }],
  });

  // LR1 (hvis det finnes LR-kamper)
  if (LR >= 1 && kamperFor("L", 1).length > 0) {
    columns.push({
      groups: [{ label: "LR1", bracket: "L" as const, runder: [1], kamper: kamperFor("L", 1) }],
    });
  }

  // For WR runde 2 til nest siste
  for (let wr = 2; wr <= WR; wr++) {
    // WR-runde
    columns.push({
      groups: [{ label: `Runde ${wr}`, bracket: "W" as const, runder: [wr], kamper: kamperFor("W", wr) }],
    });

    // Tilhørende LR-par (runde 2*wr-2 og 2*wr-1) hvis de finnes
    const lrEven = 2 * wr - 2;
    const lrOdd = 2 * wr - 1;

    if (lrEven <= LR || lrOdd <= LR) {
      const lrGroups: RoundGroup[] = [];

      if (lrEven <= LR && kamperFor("L", lrEven).length > 0) {
        lrGroups.push({
          label: `LR${lrEven}`,
          bracket: "L" as const,
          runder: [lrEven],
          kamper: kamperFor("L", lrEven),
        });
      }
      if (lrOdd <= LR && kamperFor("L", lrOdd).length > 0) {
        lrGroups.push({
          label: `LR${lrOdd}`,
          bracket: "L" as const,
          runder: [lrOdd],
          kamper: kamperFor("L", lrOdd),
        });
      }

      if (lrGroups.length > 0) {
        columns.push({ groups: lrGroups });
      }
    }
  }

  // Grand Finals
  const grandFinals = kamper.filter((k) => k.bracket === "G").sort((a, b) => a.runde - b.runde);
  if (grandFinals.length > 0) {
    columns.push({
      groups: [{ label: "Finale", bracket: "G" as const, runder: grandFinals.map((k) => k.runde), kamper: grandFinals }],
    });
  }

  // Finn turneringsvinner
  const sisteG = [...grandFinals].reverse().find((k) => k.status === "FULLFORT");
  let vinnerNavn: string | null = null;
  if (sisteG?.vinnerId) {
    const d1 = sisteG.deltager1Id === sisteG.vinnerId ? sisteG.deltager1 : null;
    const d2 = sisteG.deltager2Id === sisteG.vinnerId ? sisteG.deltager2 : null;
    vinnerNavn = (d1 ?? d2)?.user.navn ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Seeding-toggle */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setVisSeeding(!visSeeding)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors ${
            visSeeding
              ? "bg-accent-2/15 text-accent-2"
              : "text-fg-dim hover:bg-white/[0.06] hover:text-fg"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {visSeeding ? "Skjul seeding" : "Vis seeding"}
        </button>
      </div>

      {/* Bracket-kolonner */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex items-start gap-0 min-w-min">
          {columns.map((col, ci) => (
            <div key={ci} className="flex items-start">
              <BracketKolonne
                groups={col.groups}
                turneringStatus={turnering.status}
                forventetPerKamp={forventetPerKamp}
                visSeeding={visSeeding}
              />
              {/* Connector arrow between columns */}
              {ci < columns.length - 1 && <KolonnePil />}
            </div>
          ))}
        </div>
      </div>

      {/* Turneringsvinner */}
      {vinnerNavn && (
        <div className="text-center pt-2">
          <p className="text-sm font-display text-accent-2">
            🏆 {vinnerNavn}
          </p>
        </div>
      )}
    </div>
  );
}
