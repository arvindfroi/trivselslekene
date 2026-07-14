"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Badge from "@/components/ui/Badge";
import { velgVinner } from "@/lib/actions/turnering";
import { expectedSeedMap } from "@/lib/bracket";
import { Trophy, ChevronRight, Eye } from "lucide-react";

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

// Hjelp: beregn vertikal gap mellom kampkort basert på antall kamper i runden
function gapForMatchCount(count: number): string {
  if (count >= 8) return "0.25rem";
  if (count >= 4) return "1rem";
  if (count >= 2) return "3.5rem";
  return "1.5rem"; // 1 kamp — gap er irrelevant
}

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
    // TBD — vis forventet navn hvis tilgjengelig
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
      {/* Forventet navn som faint overlay — kun hvis faktisk deltager finnes OG forventet er en annen */}
      {forventetNavn && forventetNavn !== deltager.user.navn && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fg-faint/25 italic pointer-events-none">
          ({forventetNavn})
        </span>
      )}
    </div>
  );
}

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

  // Rydd opp optimistisk state når serveren bekrefter resultatet
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

function PFromKamper(kamper: TurneringMedData["kamper"]): number {
  return kamper.filter((k) => k.bracket === "W" && k.runde === 1).length * 2;
}

export default function TurneringsBracket({ turnering }: { turnering: TurneringMedData }) {
  const { kamper, deltagere } = turnering;
  const [visSeeding, setVisSeeding] = useState(false);

  // Deriver P og N
  const P = PFromKamper(kamper);
  const N = deltagere.length;

  // Bygg seed → navn lookup
  const seedNavn = new Map<number, string>();
  for (const d of deltagere) {
    seedNavn.set(d.seed, d.user.navn);
  }

  // Beregn forventede seeds per slot
  const seedMap = P >= 4 ? expectedSeedMap(P, N) : null;

  // Bygg forventet navn per kamp (key: kampId → { d1, d2 })
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

  // Utled runder dynamisk fra kampdata
  const wRunder = [...new Set(kamper.filter((k) => k.bracket === "W").map((k) => k.runde))].sort((a, b) => a - b);
  const lRunder = [...new Set(kamper.filter((k) => k.bracket === "L").map((k) => k.runde))].sort((a, b) => a - b);

  const wRounds = wRunder.map((r) => ({
    runde: r,
    kamper: kamper
      .filter((k) => k.bracket === "W" && k.runde === r)
      .sort((a, b) => a.posisjon - b.posisjon),
  }));

  const lRounds = lRunder.map((r) => ({
    runde: r,
    kamper: kamper
      .filter((k) => k.bracket === "L" && k.runde === r)
      .sort((a, b) => a.posisjon - b.posisjon),
  }));

  // Grand finals: G-M1 og ev. G-M2 (reset-kamp)
  const grandFinals = kamper
    .filter((k) => k.bracket === "G")
    .sort((a, b) => a.runde - b.runde);

  // Finn turneringsvinner
  const sisteG = [...grandFinals].reverse().find((k) => k.status === "FULLFORT");
  let vinnerNavn: string | null = null;
  if (sisteG?.vinnerId) {
    const d1 = sisteG.deltager1Id === sisteG.vinnerId ? sisteG.deltager1 : null;
    const d2 = sisteG.deltager2Id === sisteG.vinnerId ? sisteG.deltager2 : null;
    vinnerNavn = (d1 ?? d2)?.user.navn ?? null;
  }

  return (
    <div className="space-y-8">
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
          <Eye size={14} />
          Vis seeding
        </button>
      </div>

      {/* Winners bracket */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="pagaar">Winners bracket</Badge>
        </div>
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {wRounds.map((round, ri) => (
            <div key={round.runde} className="flex items-center">
              <div className="flex flex-col" style={{ gap: gapForMatchCount(round.kamper.length) }}>
                {round.kamper.map((kamp) => (
                  <KampKort
                    key={kamp.id}
                    kamp={kamp}
                    turneringStatus={turnering.status}
                    forventetD1={visSeeding ? forventetPerKamp.get(kamp.id)?.d1 ?? null : null}
                    forventetD2={visSeeding ? forventetPerKamp.get(kamp.id)?.d2 ?? null : null}
                  />
                ))}
              </div>
              {/* Connector lines to next round */}
              {ri < wRounds.length - 1 && (
                <div className="flex items-center mx-1">
                  <ChevronRight size={14} className="text-fg-faint" />
                </div>
              )}
            </div>
          ))}

          {/* Connector to Grand Finals */}
          {wRounds.length > 0 && grandFinals.length > 0 && (
            <div className="flex items-center mx-1">
              <ChevronRight size={14} className="text-accent-2" />
            </div>
          )}

          {/* Grand Finals */}
          {grandFinals.length > 0 && (
            <div className="flex flex-col gap-2">
              <Badge variant="gold">Grand Finals</Badge>
              {grandFinals.map((kamp) => (
                <KampKort
                  key={kamp.id}
                  kamp={kamp}
                  turneringStatus={turnering.status}
                  forventetD1={visSeeding ? forventetPerKamp.get(kamp.id)?.d1 ?? null : null}
                  forventetD2={visSeeding ? forventetPerKamp.get(kamp.id)?.d2 ?? null : null}
                />
              ))}
              {vinnerNavn && (
                <div className="mt-1 text-center text-sm font-display text-accent-2">
                  🏆 {vinnerNavn}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Losers bracket */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="neutral">Losers bracket</Badge>
        </div>
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {lRounds.map((round, ri) => (
            <div key={round.runde} className="flex items-center">
              <div className="flex flex-col" style={{ gap: gapForMatchCount(round.kamper.length) }}>
                {round.kamper.map((kamp) => (
                  <KampKort
                    key={kamp.id}
                    kamp={kamp}
                    turneringStatus={turnering.status}
                    forventetD1={visSeeding ? forventetPerKamp.get(kamp.id)?.d1 ?? null : null}
                    forventetD2={visSeeding ? forventetPerKamp.get(kamp.id)?.d2 ?? null : null}
                  />
                ))}
              </div>
              {/* Connector between losers rounds */}
              {ri < lRounds.length - 1 && (
                <div className="flex items-center mx-1">
                  <ChevronRight size={14} className="text-fg-faint" />
                </div>
              )}
            </div>
          ))}

          {/* Losers → Grand Finals connector */}
          {lRounds.length > 0 && grandFinals.length > 0 && (
            <div className="flex items-center mx-1">
              <ChevronRight size={14} className="text-accent-2" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
