"use client";

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ImageIcon, Plus, Trash2, Users, X } from "lucide-react";
import type { Kvalitet, LagFormat, OvelseType } from "@prisma/client";
import { fullforOnboarding, startOnboarding } from "@/lib/actions/auth";
import {
  kvalitetTekst,
  kvalitetValg,
  lagFormatTekst,
  lagFormatValg,
} from "@/lib/ovelseLabels";
import Button from "@/components/ui/Button";
import { ChoiceCard, FormatChip } from "@/components/ui/ChoiceCard";
import { Input, Label, Textarea } from "@/components/ui/Field";
import AnimatedGradientBackground from "@/components/AnimatedGradientBackground";

// ─── Bildehjelper (delt med NyOvelseForm) ──────────────────────────────────

function skalerBilde(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("lesefeil"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("bildefeil"));
      img.onload = () => {
        const maks = 1024;
        const skala = Math.min(1, maks / Math.max(img.width, img.height));
        const w = Math.round(img.width * skala);
        const h = Math.round(img.height * skala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Lokale typer ──────────────────────────────────────────────────────────

type LokalFase = {
  id: number;
  tittel: string;
  bildeUrl: string | null;
};

let nesteFaseId = 1;

type Deltager = {
  userId: string;
  navn: string;
};

type OpprettType = "ovelse" | "lagkamp" | "turnering";

type Data = {
  opprettType: OpprettType;
  lekNavn: string;
  type: OvelseType;
  lagFormat: LagFormat;
  kvaliteter: Kvalitet[];
  fellesLek: boolean;
  lokasjon: string;
  beskrivelse: string;
  bildeUrl: string | null;
  faser: LokalFase[];
  deltagere: string[];
  // Lagkamp
  antallLagkampDeltakere: number;
  antallLag: number;
  // Turnering
  antallTurneringDeltagere: number;
  turneringSeeds: { seed: number; userId: string }[];
};

const start: Data = {
  opprettType: "ovelse",
  lekNavn: "",
  type: "INDIVIDUELL",
  lagFormat: "PAR",
  kvaliteter: [],
  fellesLek: false,
  lokasjon: "",
  beskrivelse: "",
  bildeUrl: null,
  faser: [],
  deltagere: [],
  antallLagkampDeltakere: 4,
  antallLag: 2,
  antallTurneringDeltagere: 8,
  turneringSeeds: [],
};

/** Hvilke steg som vises avhenger av hva slags aktivitet som opprettes. */
function stegForType(type: OpprettType): readonly string[] {
  const felles = ["lekNavn", "typevelger"];
  if (type === "turnering") return [...felles, "turneringOppsett", "lokasjon", "beskrivelse", "oppsummering"];
  if (type === "lagkamp") return [...felles, "lagkampOppsett", "lokasjon", "beskrivelse", "oppsummering"];
  return [...felles, "spillemaate", "kvaliteter", "lokasjon", "beskrivelse", "bilde", "faser", "deltagere", "oppsummering"];
}

// ─── Hovedkomponent ────────────────────────────────────────────────────────

type Props = {
  startNavn?: string;
  startFornavn?: string;
  startEtternavn?: string;
  alleDeltagere?: Deltager[];
};

export default function Onboarding({
  startNavn = "",
  startFornavn = "",
  startEtternavn = "",
  alleDeltagere = [],
}: Props) {
  const erNy = startNavn.length > 0;

  const [data, setData] = useState<Data>(start);
  const [navn, setNavn] = useState(startNavn);
  const [fornavn, setFornavn] = useState(startFornavn);
  const [etternavn, setEtternavn] = useState(startEtternavn);
  // Kallenavnet foreslås fra fornavnet helt til brukeren redigerer det selv.
  const [kallenavnRort, setKallenavnRort] = useState(startNavn.length > 0);
  const [steg, setSteg] = useState(erNy ? 1 : 0);
  const [pending, startTransition] = useTransition();
  const [feil, setFeil] = useState<string | null>(null);
  const [hover, setHover] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const faseFileRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const STEG_KEYS = ["navn", ...stegForType(data.opprettType)];
  const total = STEG_KEYS.length;
  const key = STEG_KEYS[Math.min(steg, total - 1)];
  const filledSegments = steg + 1;

  const progress = total > 1 ? (filledSegments - 1) / (total - 1) : 0;

  const oppdater = (delta: Partial<Data>) => setData((d) => ({ ...d, ...delta }));
  const neste = () => setSteg((s) => s + 1);
  const tilbake = () => setSteg((s) => Math.max(0, s - 1));

  // ─── Navn: fornavn foreslår kallenavn til det redigeres manuelt ──
  const endreFornavn = (verdi: string) => {
    setFornavn(verdi);
    if (!kallenavnRort) setNavn(verdi);
  };
  const endreKallenavn = (verdi: string) => {
    setKallenavnRort(true);
    setNavn(verdi);
  };
  const navnStegKlar = fornavn.trim().length >= 2 && navn.trim().length >= 2;

  // ─── Deltager-avkrysning ──────────────────────────────────────────
  const toggleDeltager = (userId: string) => {
    setData((d) => ({
      ...d,
      deltagere: d.deltagere.includes(userId)
        ? d.deltagere.filter((id) => id !== userId)
        : [...d.deltagere, userId],
    }));
  };

  // ─── FellesLek auto-velger alle — tømmer ved avskrudd ────────────
  const handleFellesLekChange = (checked: boolean) => {
    oppdater({ fellesLek: checked });
    if (checked) {
      setData((d) => ({
        ...d,
        fellesLek: true,
        deltagere: alleDeltagere.map((u) => u.userId),
      }));
    } else {
      setData((d) => ({
        ...d,
        fellesLek: false,
        deltagere: [],
      }));
    }
  };

  // ─── Bildeopplastning ─────────────────────────────────────────────
  const velgFil = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await skalerBilde(file);
      oppdater({ bildeUrl: dataUrl });
    } catch {
      // ignorer
    }
  };

  const fjernBilde = () => oppdater({ bildeUrl: null });

  // ─── Faser ────────────────────────────────────────────────────────
  const leggTilFase = () => {
    setData((d) => ({
      ...d,
      faser: [...d.faser, { id: nesteFaseId++, tittel: "", bildeUrl: null }],
    }));
  };

  const fjernFase = (faseId: number) => {
    setData((d) => ({
      ...d,
      faser: d.faser.filter((f) => f.id !== faseId),
    }));
    faseFileRefs.current.delete(faseId);
  };

  const oppdaterFaseTittel = (faseId: number, tittel: string) => {
    setData((d) => ({
      ...d,
      faser: d.faser.map((f) => (f.id === faseId ? { ...f, tittel } : f)),
    }));
  };

  const velgFaseBilde = async (faseId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await skalerBilde(file);
      setData((d) => ({
        ...d,
        faser: d.faser.map((f) => (f.id === faseId ? { ...f, bildeUrl: dataUrl } : f)),
      }));
    } catch {
      // ignorer
    }
  };

  const fjernFaseBilde = (faseId: number) => {
    setData((d) => ({
      ...d,
      faser: d.faser.map((f) => (f.id === faseId ? { ...f, bildeUrl: null } : f)),
    }));
  };

  // ─── Fullfør ──────────────────────────────────────────────────────
  const fullfor = () => {
    setFeil(null);
    startTransition(async () => {
      const res = await fullforOnboarding({
        navn,
        fornavn: fornavn.trim() || undefined,
        etternavn: etternavn.trim() || undefined,
        opprettType: data.opprettType,
        lekNavn: data.lekNavn,
        type: data.type,
        lagFormat: data.type === "LAG" ? data.lagFormat : null,
        kvaliteter: data.kvaliteter,
        fellesLek: data.fellesLek,
        lokasjon: data.lokasjon,
        beskrivelse: data.beskrivelse,
        bildeUrl: data.bildeUrl,
        faser: data.faser.map((f) => ({ tittel: f.tittel, bildeUrl: f.bildeUrl })),
        deltagere: data.deltagere,
        antallLagkampDeltakere: data.antallLagkampDeltakere,
        antallLag: data.antallLag,
        antallTurneringDeltagere: data.antallTurneringDeltagere,
        turneringSeeds: data.turneringSeeds,
      });
      if (res && "feil" in res) setFeil(res.feil ?? null);
    });
  };

  return (
    <div
      className="relative isolate min-h-dvh w-full overflow-hidden"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Radial aurora */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 + 0.5 * progress }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <AnimatedGradientBackground
          Breathing
          breathingRange={hover ? 12 : 5}
          animationSpeed={hover ? 0.05 : 0.02}
          containerClassName="[transition:filter_0.6s_ease]"
          containerStyle={{ filter: hover ? "blur(45px)" : "blur(0px)" }}
        />
      </motion.div>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < filledSegments ? "" : "bg-white/10"
              }`}
              style={
                i < filledSegments
                  ? {
                      backgroundImage:
                        "linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 50%, var(--accent-3) 100%)",
                      backgroundSize: `${total * 100}% 100%`,
                      backgroundPosition: `${(i / (total - 1)) * 100}% 0`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <div key={key} className="animate-fade-up">
          <div>
            {key === "navn" && (
              <div>
                <p className="text-xs tracking-[0.3em] text-fg-faint uppercase">
                  Steg 1 av {total}
                </p>
                <h1 className="mt-2 font-display text-3xl text-fg">
                  Hva heter du?
                </h1>
                <p className="mt-2 text-sm text-fg-dim">
                  Ingen e-post eller passord. Skriv navnet ditt, og velg hva du
                  vil bli kalt — bruker du et kallenavn du har brukt før, logger
                  du rett inn igjen.
                </p>
                {erNy ? (
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="fornavn">Fornavn</Label>
                        <Input
                          id="fornavn"
                          autoFocus
                          value={fornavn}
                          onChange={(e) => endreFornavn(e.target.value)}
                          placeholder="Ola"
                        />
                      </div>
                      <div>
                        <Label htmlFor="etternavn">Etternavn</Label>
                        <Input
                          id="etternavn"
                          value={etternavn}
                          onChange={(e) => setEtternavn(e.target.value)}
                          placeholder="Nordmann"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="kallenavn">Hva vil du bli kalt?</Label>
                      <Input
                        id="kallenavn"
                        value={navn}
                        onChange={(e) => endreKallenavn(e.target.value)}
                        placeholder="Ola"
                        className="text-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && navnStegKlar) neste();
                        }}
                      />
                      <p className="mt-1.5 text-xs text-fg-faint">
                        Dette vises til de andre i lekene.
                      </p>
                    </div>
                    <Button
                      onClick={neste}
                      disabled={!navnStegKlar}
                      className="w-full"
                    >
                      Neste
                      <ArrowRight size={18} />
                    </Button>
                  </div>
                ) : (
                  <form
                    action={startOnboarding}
                    className="mt-6 flex flex-col gap-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="fornavn">Fornavn</Label>
                        <Input
                          id="fornavn"
                          name="fornavn"
                          autoFocus
                          required
                          minLength={2}
                          value={fornavn}
                          onChange={(e) => endreFornavn(e.target.value)}
                          placeholder="Ola"
                        />
                      </div>
                      <div>
                        <Label htmlFor="etternavn">Etternavn</Label>
                        <Input
                          id="etternavn"
                          name="etternavn"
                          value={etternavn}
                          onChange={(e) => setEtternavn(e.target.value)}
                          placeholder="Nordmann"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="kallenavn">Hva vil du bli kalt?</Label>
                      <Input
                        id="kallenavn"
                        name="kallenavn"
                        required
                        minLength={2}
                        value={navn}
                        onChange={(e) => endreKallenavn(e.target.value)}
                        placeholder="Ola"
                        className="text-lg"
                      />
                      <p className="mt-1.5 text-xs text-fg-faint">
                        Dette vises til de andre i lekene.
                      </p>
                    </div>
                    <NavnKnapp />
                  </form>
                )}
              </div>
            )}

            {key === "lekNavn" && (
              <StepShell
                steg={filledSegments}
                total={total}
                hei={navn}
                tittel="Hva heter leken din?"
                tekst="Alle er vert for én lek. Hva vil du kalle din?"
              >
                <Input
                  autoFocus
                  value={data.lekNavn}
                  onChange={(e) => oppdater({ lekNavn: e.target.value })}
                  placeholder="F.eks. Stikkball, Bridge, Sekkeløp"
                  className="text-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && data.lekNavn.trim()) neste();
                  }}
                />
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv={data.lekNavn.trim().length > 0}
                />
              </StepShell>
            )}

            {key === "typevelger" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Hva vil du opprette?"
                tekst="Du kan lage en vanlig øvelse, en lagkamp eller en turnering."
              >
                <div className="grid grid-cols-1 gap-3">
                  <ChoiceCard
                    valgt={data.opprettType === "ovelse"}
                    onClick={() => oppdater({ opprettType: "ovelse" })}
                    tittel="Øvelse"
                    tekst="En enkelt lek — individuell eller lag"
                  />
                  <ChoiceCard
                    valgt={data.opprettType === "lagkamp"}
                    onClick={() => oppdater({ opprettType: "lagkamp" })}
                    tittel="Lagkamp"
                    tekst="Automatisk lagoppsett fra stillingen"
                  />
                  <ChoiceCard
                    valgt={data.opprettType === "turnering"}
                    onClick={() => {
                      // Forhåndsutfyll seeds med de første N deltagerne
                      const seeds = alleDeltagere
                        .slice(0, data.antallTurneringDeltagere)
                        .map((d, i) => ({ seed: i + 1, userId: d.userId }));
                      oppdater({ opprettType: "turnering", turneringSeeds: seeds });
                    }}
                    tittel="Turnering"
                    tekst="Single elimination med seeds"
                  />
                </div>
                <NavRad tilbake={tilbake} neste={neste} nesteAktiv />
              </StepShell>
            )}

            {key === "spillemaate" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Hvordan spilles leken?"
                tekst="Velg oppsett — og om det er en felles lek."
              >
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceCard
                    valgt={data.type === "INDIVIDUELL"}
                    onClick={() => oppdater({ type: "INDIVIDUELL" })}
                    tittel="Individuell"
                    tekst="Alle for seg selv"
                  />
                  <ChoiceCard
                    valgt={data.type === "LAG"}
                    onClick={() => oppdater({ type: "LAG" })}
                    tittel="Lag"
                    tekst="Konkurrer i lag"
                  />
                </div>

                <AnimatePresence initial={false}>
                  {data.type === "LAG" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="mb-2 text-[11px] font-medium tracking-widest text-fg-dim uppercase">
                        Hvordan er lagene satt opp?
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {lagFormatValg.map((v) => (
                          <FormatChip
                            key={v.verdi}
                            valgt={data.lagFormat === v.verdi}
                            onClick={() => oppdater({ lagFormat: v.verdi })}
                            tittel={v.tittel}
                            hint={v.hint}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => handleFellesLekChange(!data.fellesLek)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    data.fellesLek
                      ? "border-accent-3 bg-accent-3/10"
                      : "border-line bg-white/[0.03] hover:border-line-strong"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      data.fellesLek
                        ? "bg-accent-3/20 text-accent-3"
                        : "bg-white/[0.06] text-fg-faint"
                    }`}
                  >
                    <Users size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-fg">Felles lek</span>
                    <span className="block text-sm text-fg-dim">
                      Alle er med, også du — ingen fast vert.
                    </span>
                  </span>
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      data.fellesLek ? "bg-accent-3" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                        data.fellesLek ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>

                <NavRad tilbake={tilbake} neste={neste} nesteAktiv />
              </StepShell>
            )}

            {key === "kvaliteter" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Hva tester leken?"
                tekst="Velg egenskapene leken din setter på prøve. Valgfritt."
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-fg-faint">
                    {data.kvaliteter.length} av {kvalitetValg.length} valgt
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        oppdater({
                          kvaliteter: kvalitetValg.map((k) => k.verdi),
                        })
                      }
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent-2/10"
                    >
                      Alle
                    </button>
                    <button
                      type="button"
                      onClick={() => oppdater({ kvaliteter: [] })}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-dim transition-colors hover:bg-white/[0.06]"
                    >
                      Ingen
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {kvalitetValg.map((k) => {
                    const valgt = data.kvaliteter.includes(k.verdi);
                    return (
                      <button
                        key={k.verdi}
                        type="button"
                        onClick={() =>
                          oppdater({
                            kvaliteter: valgt
                              ? data.kvaliteter.filter((x) => x !== k.verdi)
                              : [...data.kvaliteter, k.verdi],
                          })
                        }
                        className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-all ${
                          valgt
                            ? "border-accent-2 bg-accent-2/10 text-fg"
                            : "border-line bg-white/[0.03] text-fg-dim hover:border-line-strong hover:text-fg"
                        }`}
                      >
                        <k.Ikon size={16} className="shrink-0" />
                        <span className="font-medium">{k.tittel}</span>
                      </button>
                    );
                  })}
                </div>
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv
                  hoppOver
                />
              </StepShell>
            )}

            {key === "lokasjon" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Hvor foregår leken?"
                tekst="Valgfritt — men greit for de andre å vite."
              >
                <Input
                  autoFocus
                  value={data.lokasjon}
                  onChange={(e) => oppdater({ lokasjon: e.target.value })}
                  placeholder="F.eks. i hagen, på stranda, hjemme hos meg"
                  className="text-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") neste();
                  }}
                />
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv={data.lokasjon.trim().length > 0}
                  hoppOver
                />
              </StepShell>
            )}

            {key === "beskrivelse" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Noe mer vi bør vite?"
                tekst="Regler, utstyr, eller andre viktige detaljer. Valgfritt."
              >
                <Textarea
                  autoFocus
                  rows={4}
                  value={data.beskrivelse}
                  onChange={(e) => oppdater({ beskrivelse: e.target.value })}
                  placeholder="Kort beskrivelse av leken…"
                />
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv={data.beskrivelse.trim().length > 0}
                  hoppOver
                />
              </StepShell>
            )}

            {/* ─── Nytt steg: Bilde ─────────────────────────────────── */}
            {key === "bilde" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Kart eller illustrasjon?"
                tekst="Last opp et bilde som viser banen, oppsettet eller leken. Valgfritt."
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={velgFil}
                />
                {data.bildeUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.bildeUrl}
                      alt="Forhåndsvisning"
                      className="max-h-64 w-full object-contain bg-black/20"
                    />
                    <button
                      type="button"
                      onClick={fjernBilde}
                      className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur transition-colors hover:bg-red-600"
                      aria-label="Fjern bilde"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white/[0.02] px-4 py-6 text-sm text-fg-dim transition-colors hover:border-accent-2 hover:text-accent-2"
                  >
                    <ImageIcon size={18} />
                    Last opp kart eller illustrasjon
                  </button>
                )}
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv
                  hoppOver
                />
              </StepShell>
            )}

            {/* ─── Nytt steg: Faser ─────────────────────────────────── */}
            {key === "faser" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Flere deler?"
                tekst="Del leken i faser med hvert sitt bilde. Verten kan navigere mellom fasene. Valgfritt."
              >
                <Button
                  type="button"
                  variant="outline"
                  className="self-start px-3 py-2 text-xs"
                  onClick={leggTilFase}
                >
                  <Plus size={14} /> Legg til fase
                </Button>

                {data.faser.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {data.faser.map((fase, i) => (
                      <div
                        key={fase.id}
                        className="flex flex-col gap-2 rounded-lg border border-line bg-white/[0.03] p-3 sm:flex-row sm:items-start"
                      >
                        <span className="shrink-0 pt-1 text-xs font-medium tabular-nums text-fg-dim">
                          Fase {i + 1}
                        </span>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Tittel (valgfritt, f.eks. «Hele hagen»)"
                            value={fase.tittel}
                            onChange={(e) =>
                              oppdaterFaseTittel(fase.id, e.target.value)
                            }
                          />
                          <input
                            ref={(el) => {
                              if (el) faseFileRefs.current.set(fase.id, el);
                              else faseFileRefs.current.delete(fase.id);
                            }}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => velgFaseBilde(fase.id, e)}
                          />
                          {fase.bildeUrl ? (
                            <div className="relative overflow-hidden rounded-lg border border-line">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={fase.bildeUrl}
                                alt={`Forhåndsvisning fase ${i + 1}`}
                                className="max-h-40 w-full object-contain bg-black/20"
                              />
                              <button
                                type="button"
                                onClick={() => fjernFaseBilde(fase.id)}
                                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white backdrop-blur transition-colors hover:bg-red-600"
                                aria-label="Fjern bilde"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                faseFileRefs.current.get(fase.id)?.click()
                              }
                              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-white/[0.02] px-3 py-4 text-xs text-fg-dim transition-colors hover:border-accent-2 hover:text-accent-2"
                            >
                              <ImageIcon size={14} />
                              Last opp bilde for fase {i + 1}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fjernFase(fase.id)}
                          className="shrink-0 self-end rounded-lg p-1.5 text-fg-faint transition-colors hover:bg-red-600/10 hover:text-red-400 sm:self-start"
                          aria-label={`Fjern fase ${i + 1}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv
                  hoppOver
                />
              </StepShell>
            )}

            {/* ─── Nytt steg: Deltagere ──────────────────────────────── */}
            {key === "deltagere" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Hvem er med?"
                tekst="Velg deltagere til leken. Verten (du) telles automatisk. Valgfritt."
              >
                {alleDeltagere.length === 0 ? (
                  <p className="text-sm text-fg-dim">
                    Ingen andre deltagere å velge — du blir med alene.
                  </p>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-fg-faint">
                        {data.deltagere.length} av {alleDeltagere.length} valgt
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            oppdater({
                              deltagere: alleDeltagere.map((u) => u.userId),
                            })
                          }
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent-2/10"
                        >
                          Alle
                        </button>
                        <button
                          type="button"
                          onClick={() => oppdater({ deltagere: [] })}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-dim transition-colors hover:bg-white/[0.06]"
                        >
                          Ingen
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {alleDeltagere.map((d) => {
                        const valgt = data.deltagere.includes(d.userId);
                        return (
                          <button
                            key={d.userId}
                            type="button"
                            onClick={() => toggleDeltager(d.userId)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                              valgt
                                ? "border-accent-2 bg-accent-2/10 text-fg"
                                : "border-line bg-white/[0.03] text-fg-dim hover:border-line-strong"
                            }`}
                          >
                            {valgt && <Check size={14} className="text-accent-2" />}
                            <span>{d.navn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv
                  hoppOver
                />
              </StepShell>
            )}

            {/* ─── Turnering-oppsett ─────────────────────────────────── */}
            {key === "turneringOppsett" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Sett opp turneringen"
                tekst="Velg antall deltagere og hvem som har hvilken seed."
              >
                <div>
                  <Label>Antall deltagere</Label>
                  <Input
                    type="number"
                    min={3}
                    max={64}
                    value={String(data.antallTurneringDeltagere)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 3 && v <= 64) {
                        oppdater({ antallTurneringDeltagere: v });
                      }
                    }}
                    className="w-24"
                  />
                </div>

                <p className="text-xs text-fg-dim">
                  Velg deltagere i seed-rekkefølge (seed 1 = best). Forhåndsutfylt fra listen.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: data.antallTurneringDeltagere }, (_, i) => i + 1).map((seed) => {
                    const valgt = data.turneringSeeds.find((s) => s.seed === seed)?.userId ?? "";
                    return (
                      <div key={seed}>
                        <Label className="text-xs">Seed #{seed}</Label>
                        <select
                          value={valgt}
                          onChange={(e) => {
                            const userId = e.target.value;
                            setData((d) => {
                              const resten = d.turneringSeeds.filter((s) => s.seed !== seed);
                              if (userId) {
                                return { ...d, turneringSeeds: [...resten, { seed, userId }] };
                              }
                              return { ...d, turneringSeeds: resten };
                            });
                          }}
                          className="w-full rounded-lg border border-line bg-white/[0.04] px-3 py-2 text-sm text-fg"
                          required
                        >
                          <option value="">Velg deltager</option>
                          {alleDeltagere.map((d) => (
                            <option key={d.userId} value={d.userId}>
                              {d.navn}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
                <NavRad
                  tilbake={tilbake}
                  neste={neste}
                  nesteAktiv={data.turneringSeeds.length === data.antallTurneringDeltagere}
                />
              </StepShell>
            )}

            {/* ─── Lagkamp-oppsett ────────────────────────────────────── */}
            {key === "lagkampOppsett" && (
              <StepShell
                steg={filledSegments}
                total={total}
                tittel="Sett opp lagkampen"
                tekst="Velg antall deltakere og lag. Spillerne fordeles automatisk fra stillingen."
              >
                <div>
                  <Label>Antall deltakere</Label>
                  <Input
                    type="number"
                    min={2}
                    value={String(data.antallLagkampDeltakere)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 2) oppdater({ antallLagkampDeltakere: v });
                    }}
                    className="w-24"
                  />
                </div>
                <div>
                  <Label>Antall lag</Label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={String(data.antallLag)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 2 && v <= 10) oppdater({ antallLag: v });
                    }}
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-fg-faint">
                  Topp {data.antallLagkampDeltakere} fra stillingen fordeles på {data.antallLag} lag.
                </p>
                <NavRad tilbake={tilbake} neste={neste} nesteAktiv />
              </StepShell>
            )}

            {key === "oppsummering" && (
              <div>
                <p className="text-xs tracking-[0.3em] text-fg-faint uppercase">
                  Nesten ferdig
                </p>
                <h1 className="mt-2 font-display text-3xl text-fg">
                  Ser dette riktig ut?
                </h1>
                <dl className="mt-6 flex flex-col divide-y divide-line rounded-2xl border border-line bg-white/[0.03]">
                  <Rad merke="Du blir kalt" verdi={navn} />
                  {(fornavn.trim() || etternavn.trim()) && (
                    <Rad
                      merke="Fullt navn"
                      verdi={`${fornavn.trim()} ${etternavn.trim()}`.trim()}
                    />
                  )}
                  <Rad merke="Lek" verdi={data.lekNavn} />
                  {data.opprettType === "turnering" ? (
                    <>
                      <Rad merke="Type" verdi="Turnering" />
                      <Rad
                        merke="Deltagere"
                        verdi={`${data.antallTurneringDeltagere} seeds`}
                      />
                    </>
                  ) : data.opprettType === "lagkamp" ? (
                    <>
                      <Rad merke="Type" verdi="Lagkamp" />
                      <Rad
                        merke="Oppsett"
                        verdi={`${data.antallLagkampDeltakere} deltakere, ${data.antallLag} lag`}
                      />
                    </>
                  ) : (
                    <>
                      <Rad
                        merke="Oppsett"
                        verdi={
                          data.type === "LAG"
                            ? `Lag — ${lagFormatTekst[data.lagFormat]}`
                            : "Individuell"
                        }
                      />
                      {data.kvaliteter.length > 0 && (
                        <Rad
                          merke="Egenskaper"
                          verdi={data.kvaliteter
                            .map((k) => kvalitetTekst[k])
                            .join(", ")}
                        />
                      )}
                      <Rad
                        merke="Felles lek"
                        verdi={data.fellesLek ? "Ja, alle er med" : "Nei"}
                      />
                      {data.bildeUrl && (
                        <Rad merke="Bilde" verdi="Lastet opp" />
                      )}
                      {data.faser.length > 0 && (
                        <Rad
                          merke="Faser"
                          verdi={`${data.faser.length} fase${data.faser.length > 1 ? "r" : ""}`}
                        />
                      )}
                      {data.deltagere.length > 0 && (
                        <Rad
                          merke="Deltagere"
                          verdi={`${data.deltagere.length} valgt`}
                        />
                      )}
                    </>
                  )}
                  {data.lokasjon.trim() && (
                    <Rad merke="Lokasjon" verdi={data.lokasjon} />
                  )}
                  {data.beskrivelse.trim() && (
                    <Rad merke="Beskrivelse" verdi={data.beskrivelse} />
                  )}
                </dl>

                {feil && <p className="mt-3 text-sm text-red-300">{feil}</p>}

                <div className="mt-6 flex items-center gap-3">
                  <Button variant="outline" onClick={tilbake} className="px-4">
                    <ArrowLeft size={18} />
                    Tilbake
                  </Button>
                  <Button onClick={fullfor} disabled={pending} className="flex-1">
                    {pending ? "Blir med…" : "Bli med i lekene"}
                    <Check size={18} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hjelpekomponenter ─────────────────────────────────────────────────────

function NavnKnapp() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-5 w-full">
      {pending ? "Fortsetter…" : "Fortsett"}
      <ArrowRight size={18} />
    </Button>
  );
}

function StepShell({
  steg,
  total,
  tittel,
  tekst,
  hei,
  children,
}: {
  steg: number;
  total: number;
  tittel: string;
  tekst: string;
  hei?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs tracking-[0.3em] text-fg-faint uppercase">
        Steg {steg} av {total}
        {hei ? ` · Hei, ${hei}!` : ""}
      </p>
      <h1 className="mt-2 font-display text-3xl text-fg">{tittel}</h1>
      <p className="mt-2 text-sm text-fg-dim">{tekst}</p>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function NavRad({
  tilbake,
  neste,
  nesteAktiv,
  hoppOver = false,
}: {
  tilbake?: () => void;
  neste: () => void;
  nesteAktiv: boolean;
  hoppOver?: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      {tilbake && (
        <Button variant="outline" onClick={tilbake} className="px-4">
          <ArrowLeft size={18} />
          Tilbake
        </Button>
      )}
      {hoppOver && !nesteAktiv ? (
        <Button variant="secondary" onClick={neste} className="flex-1">
          Hopp over
        </Button>
      ) : (
        <Button onClick={neste} disabled={!nesteAktiv} className="flex-1">
          Neste
          <ArrowRight size={18} />
        </Button>
      )}
    </div>
  );
}

function Rad({ merke, verdi }: { merke: string; verdi: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-xs tracking-widest text-fg-faint uppercase">{merke}</dt>
      <dd className="max-w-[65%] text-right text-sm text-fg">{verdi}</dd>
    </div>
  );
}
