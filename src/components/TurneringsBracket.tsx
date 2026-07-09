"use client";

import { useState, useTransition } from "react";
import Avatar from "@/components/Avatar";
import Badge from "@/components/ui/Badge";
import { velgVinner } from "@/lib/actions/turnering";
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

// Hjelp: finn kamp i en gitt posisjon
function finnKamp(kamper: TurneringMedData["kamper"], bracket: string, runde: number, posisjon: number) {
  return kamper.find((k) => k.bracket === bracket && k.runde === runde && k.posisjon === posisjon);
}

function DeltagerLinje({
  deltager,
  erVinner,
  erTaper,
  onClick,
  kanKlikke,
}: {
  deltager: { user: { navn: string; bildeUrl: string | null } } | null;
  erVinner: boolean;
  erTaper: boolean;
  onClick?: () => void;
  kanKlikke: boolean;
}) {
  if (!deltager) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-fg-faint italic">
        TBD
      </div>
    );
  }

  return (
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
  );
}

function KampKort({
  kamp,
  turneringStatus,
}: {
  kamp: TurneringMedData["kamper"][number];
  turneringStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistiskVinner, setOptimistiskVinner] = useState<string | null>(null);

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
      />
      <div className="mx-2 my-0.5 border-t border-line" />
      <DeltagerLinje
        deltager={kamp.deltager2}
        erVinner={erD2Vinner}
        erTaper={erFerdig && !erD2Vinner}
        onClick={kanKlikke ? () => handleVelgVinner(kamp.deltager2Id!) : undefined}
        kanKlikke={kanKlikke}
      />
    </div>
  );
}

export default function TurneringsBracket({ turnering }: { turnering: TurneringMedData }) {
  const { kamper } = turnering;

  // Winners bracket: runder 1-3
  const wRounds = [1, 2, 3].map((r) => ({
    runde: r,
    kamper: [1, 2, 3, 4]
      .map((p) => finnKamp(kamper, "W", r, p))
      .filter(Boolean) as TurneringMedData["kamper"],
  }));

  // Losers bracket: runder 1-4
  const lRounds = [1, 2, 3, 4].map((r) => ({
    runde: r,
    kamper: [1, 2, 3, 4]
      .map((p) => finnKamp(kamper, "L", r, p))
      .filter(Boolean) as TurneringMedData["kamper"],
  }));

  // Grand finals
  const grandFinals = [1, 2]
    .map((p) => finnKamp(kamper, "G", 1, p) ?? finnKamp(kamper, "G", 2, p))
    .filter(Boolean) as TurneringMedData["kamper"];

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
      {/* Winners bracket */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="pagaar">Winners bracket</Badge>
        </div>
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {wRounds.map((round, ri) => (
            <div key={round.runde} className="flex items-center">
              <div className="flex flex-col" style={{ gap: round.runde === 1 ? "1rem" : round.runde === 2 ? "3.5rem" : "8rem" }}>
                {round.kamper.map((kamp) => (
                  <KampKort
                    key={kamp.id}
                    kamp={kamp}
                    turneringStatus={turnering.status}
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
              <div className="flex flex-col" style={{ gap: round.runde <= 2 ? "1.5rem" : round.runde === 3 ? "3rem" : "1.5rem" }}>
                {round.kamper.map((kamp) => (
                  <KampKort
                    key={kamp.id}
                    kamp={kamp}
                    turneringStatus={turnering.status}
                  />
                ))}
              </div>
              {/* Connector from losers to Grand Finals (LR4 → G) */}
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
