"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { velgVinner } from "@/lib/actions/turnering";
import { expectedSeedMap, winnersRunder, losersRunder } from "@/lib/bracket";

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
        className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded w-full transition-colors ${
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
  kampRef,
}: {
  kamp: TurneringMedData["kamper"][number];
  turneringStatus: string;
  forventetD1: string | null;
  forventetD2: string | null;
  kampRef?: (el: HTMLDivElement | null) => void;
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
      ref={kampRef}
      data-kamp-id={kamp.id}
      data-bracket={kamp.bracket}
      data-runde={kamp.runde}
      data-posisjon={kamp.posisjon}
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

// ─── Round-labels ─────────────────────────────────────────────────────────

function roundLabel(bracket: string, runde: number, P: number): string {
  const WR = winnersRunder(P);
  const LR = losersRunder(P);
  if (bracket === "W") {
    if (WR === 5 && runde === 5) return "Winners Finale";
    if (WR === 4 && runde === 4) return "Winners Finale";
    if (WR === 3 && runde === 3) return "Winners Finale";
    if (runde === 1) return "Runde 1";
    if (runde === 2 && WR >= 4) return "Runde 2";
    if (runde === 3 && WR >= 5) return "Kvartfinale";
    if (runde === 4 && WR >= 6) return "Semifinale";
    return `WR${runde}`;
  }
  if (bracket === "L") {
    if (runde === LR) return "Losers Finale";
    if (runde === 1) return "LR1";
    return `LR${runde}`;
  }
  return "Grand Finals";
}

function formatAntallKamper(n: number): string {
  return `${n} kamp${n === 1 ? "" : "er"}`;
}

// ─── Bracket-linjer (SVG) ────────────────────────────────────────────────

function BracketLinjer({
  containerRef,
  redrawTick,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  redrawTick: number;
}) {
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const newPaths: string[] = [];
    const matchEls = container.querySelectorAll<HTMLDivElement>("[data-kamp-id]");

    const byKey = new Map<string, HTMLDivElement>();
    for (const el of matchEls) {
      const b = el.dataset.bracket;
      const r = el.dataset.runde;
      const p = el.dataset.posisjon;
      if (b && r && p) byKey.set(`${b}-${r}-${p}`, el);
    }

    const cRect = container.getBoundingClientRect();

    const addLine = (srcEl: HTMLDivElement, tgtEl: HTMLDivElement) => {
      const s = srcEl.getBoundingClientRect();
      const t = tgtEl.getBoundingClientRect();

      const x1 = s.right - cRect.left + 4;
      const y1 = s.top + s.height / 2 - cRect.top;
      const x2 = t.left - cRect.left - 4;
      const y2 = t.top + t.height / 2 - cRect.top;

      const midX = (x1 + x2) / 2;
      newPaths.push(`M${x1.toFixed(1)},${y1.toFixed(1)} H${midX.toFixed(1)} V${y2.toFixed(1)} H${x2.toFixed(1)}`);
    };

    // Winners: position n and n+1 in round r feed into ceil(n/2) in round r+1
    for (const [key, srcEl] of byKey) {
      const [bracket, rStr, pStr] = key.split("-");
      const r = parseInt(rStr);
      const p = parseInt(pStr);

      if (bracket === "W") {
        const targetKey = `W-${r + 1}-${Math.ceil(p / 2)}`;
        const tgt = byKey.get(targetKey);
        if (tgt) addLine(srcEl, tgt);
      } else if (bracket === "L") {
        if (r % 2 === 1) {
          const targetKey = `L-${r + 1}-${p}`;
          const tgt = byKey.get(targetKey);
          if (tgt) addLine(srcEl, tgt);
        } else {
          const targetKey = `L-${r + 1}-${Math.ceil(p / 2)}`;
          const tgt = byKey.get(targetKey);
          if (tgt) addLine(srcEl, tgt);
        }
      }
    }

    setPaths(newPaths);
  }, [containerRef, redrawTick]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0 overflow-visible"
      style={{ width: "100%", height: "100%" }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-line"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// ─── Hovedkomponent ──────────────────────────────────────────────────────

export default function TurneringsBracket({ turnering }: { turnering: TurneringMedData }) {
  const { kamper, deltagere } = turnering;
  const [visSeeding, setVisSeeding] = useState(false);
  const [redrawTick, setRedrawTick] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // Group matches
  const kamperFor = (bracket: string, runde: number) =>
    kamper
      .filter((k) => k.bracket === bracket && k.runde === runde)
      .sort((a, b) => a.posisjon - b.posisjon);

  // Winners rounds
  const winnerRounds: { runde: number; label: string; kamper: typeof kamper }[] = [];
  for (let r = 1; r <= WR; r++) {
    const k = kamperFor("W", r);
    if (k.length > 0) winnerRounds.push({ runde: r, label: roundLabel("W", r, P), kamper: k });
  }

  // Losers rounds
  const loserRounds: { runde: number; label: string; kamper: typeof kamper }[] = [];
  for (let r = 1; r <= LR; r++) {
    const k = kamperFor("L", r);
    if (k.length > 0) loserRounds.push({ runde: r, label: roundLabel("L", r, P), kamper: k });
  }

  // Grand Finals
  const grandFinals = kamper.filter((k) => k.bracket === "G").sort((a, b) => a.runde - b.runde);

  // Turneringsvinner
  const sisteG = [...grandFinals].reverse().find((k) => k.status === "FULLFORT");
  let vinnerNavn: string | null = null;
  if (sisteG?.vinnerId) {
    const d1 = sisteG.deltager1Id === sisteG.vinnerId ? sisteG.deltager1 : null;
    const d2 = sisteG.deltager2Id === sisteG.vinnerId ? sisteG.deltager2 : null;
    vinnerNavn = (d1 ?? d2)?.user.navn ?? null;
  }

  // Match refs for bracket lines
  const kampRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setKampRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) kampRefs.current.set(id, el);
      else kampRefs.current.delete(id);
    },
    [],
  );

  // Redraw SVG on resize and tab switch
  useEffect(() => {
    const redraw = () => setRedrawTick((n) => n + 1);
    window.addEventListener("resize", redraw);
    const handle = setTimeout(redraw, 200);
    return () => {
      window.removeEventListener("resize", redraw);
      clearTimeout(handle);
    };
  }, []);

  return (
    <div className="space-y-4">
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

      {/* Bracket container */}
      <div ref={containerRef} className="relative overflow-x-auto pb-2">
        <BracketLinjer containerRef={containerRef} redrawTick={redrawTick} />

        <div className="relative z-10 space-y-6">
          {/* ═══════ WINNERS BRACKET ═══════ */}
          <div>
            <p className="text-[11px] font-bold text-accent-2 uppercase tracking-wider mb-2 px-1">
              Winners bracket
            </p>
            <div className="flex items-start gap-8">
              {winnerRounds.map((wr) => (
                <BracketKolonne
                  key={`W-${wr.runde}`}
                  label={wr.label}
                  sublabel={formatAntallKamper(wr.kamper.length)}
                  kamper={wr.kamper}
                  turneringStatus={turnering.status}
                  forventetPerKamp={forventetPerKamp}
                  visSeeding={visSeeding}
                  setKampRef={setKampRef}
                />
              ))}
              {/* GF column — aligned with WF (last winners column) */}
              {grandFinals.length > 0 && (
                <BracketKolonne
                  label="Grand Finals"
                  sublabel={grandFinals.length > 1 ? "incl. reset" : undefined}
                  kamper={grandFinals}
                  turneringStatus={turnering.status}
                  forventetPerKamp={forventetPerKamp}
                  visSeeding={visSeeding}
                  setKampRef={setKampRef}
                  isGrandFinals
                />
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-line/40" />

          {/* ═══════ LOSERS BRACKET ═══════ */}
          <div>
            <p className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider mb-2 px-1">
              Losers bracket
            </p>
            <div className="flex items-start gap-8">
              {loserRounds.map((lr) => (
                <BracketKolonne
                  key={`L-${lr.runde}`}
                  label={lr.label}
                  sublabel={formatAntallKamper(lr.kamper.length)}
                  kamper={lr.kamper}
                  turneringStatus={turnering.status}
                  forventetPerKamp={forventetPerKamp}
                  visSeeding={visSeeding}
                  setKampRef={setKampRef}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Turneringsvinner */}
      {vinnerNavn && (
        <div className="text-center pt-2">
          <p className="text-sm font-display text-accent-2">🏆 {vinnerNavn}</p>
        </div>
      )}
    </div>
  );
}

// ─── BracketKolonne ───────────────────────────────────────────────────────

function BracketKolonne({
  label,
  sublabel,
  kamper,
  turneringStatus,
  forventetPerKamp,
  visSeeding,
  setKampRef,
  isGrandFinals,
}: {
  label: string;
  sublabel?: string;
  kamper: TurneringMedData["kamper"];
  turneringStatus: string;
  forventetPerKamp: Map<string, { d1: string | null; d2: string | null }>;
  visSeeding: boolean;
  setKampRef: (id: string) => (el: HTMLDivElement | null) => void;
  isGrandFinals?: boolean;
}) {
  const n = kamper.length;

  // Gap between matches: more matches → tighter; fewer → more spread
  const gap =
    n >= 8 ? "0.5rem"
    : n >= 4 ? "1.25rem"
    : n >= 2 ? "3rem"
    : "0";

  return (
    <div className="flex flex-col shrink-0">
      <div className="text-center mb-2">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            isGrandFinals ? "text-yellow-400/90" : "text-fg-faint"
          }`}
        >
          {label}
        </p>
        {sublabel && (
          <p className="text-[9px] text-fg-faint/50">{sublabel}</p>
        )}
      </div>
      <div className="flex flex-col" style={{ gap }}>
        {kamper.map((kamp) => {
          const f = forventetPerKamp.get(kamp.id);
          return (
            <div key={kamp.id} className="flex flex-col gap-0.5">
              <KampKort
                kamp={kamp}
                turneringStatus={turneringStatus}
                forventetD1={visSeeding ? f?.d1 ?? null : null}
                forventetD2={visSeeding ? f?.d2 ?? null : null}
                kampRef={setKampRef(kamp.id)}
              />
              {kamp.bracket === "G" && kamp.runde === 2 && (
                <p className="text-[9px] text-fg-faint/60 text-center italic">
                  Reset — vinneren kåres her
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
