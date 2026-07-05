"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Users } from "lucide-react";
import type { Kvalitet, LagFormat, OvelseType } from "@prisma/client";
import { fullforOnboarding, startOnboarding } from "@/lib/actions/auth";
import {
  kvalitetTekst,
  kvalitetValg,
  lagFormatTekst,
  lagFormatValg,
} from "@/lib/ovelseLabels";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import AnimatedGradientBackground from "@/components/AnimatedGradientBackground";

type Data = {
  lekNavn: string;
  type: OvelseType;
  lagFormat: LagFormat;
  kvaliteter: Kvalitet[];
  fellesLek: boolean;
  lokasjon: string;
  beskrivelse: string;
};

const start: Data = {
  lekNavn: "",
  type: "INDIVIDUELL",
  lagFormat: "PAR",
  kvaliteter: [],
  fellesLek: false,
  lokasjon: "",
  beskrivelse: "",
};

const POST_NAVN = [
  "lekNavn",
  "spillemaate",
  "kvaliteter",
  "lokasjon",
  "beskrivelse",
  "oppsummering",
] as const;

function ChoiceCard({
  valgt,
  onClick,
  tittel,
  tekst,
}: {
  valgt: boolean;
  onClick: () => void;
  tittel: string;
  tekst?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        valgt
          ? "border-accent-2 bg-accent-2/10 shadow-[0_0_0_1px_var(--accent-2)]"
          : "border-line bg-white/[0.03] hover:border-line-strong hover:bg-white/[0.06]"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-display text-lg text-fg">{tittel}</span>
        {valgt && <Check size={18} className="text-accent-2" />}
      </span>
      {tekst && <span className="mt-1 block text-sm text-fg-dim">{tekst}</span>}
    </button>
  );
}

function FormatChip({
  valgt,
  onClick,
  tittel,
  hint,
}: {
  valgt: boolean;
  onClick: () => void;
  tittel: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all ${
        valgt
          ? "border-accent-2 bg-accent-2/10"
          : "border-line bg-white/[0.03] hover:border-line-strong hover:bg-white/[0.06]"
      }`}
    >
      <span className="block font-medium text-fg">{tittel}</span>
      <span className="mt-0.5 block text-xs text-fg-faint">{hint}</span>
    </button>
  );
}

export default function Onboarding({ startNavn = "" }: { startNavn?: string }) {
  const erNy = startNavn.length > 0;

  const [data, setData] = useState<Data>(start);
  const [navn, setNavn] = useState(startNavn);
  // Navn-steget er alltid steg 0. Nye brukere starter der; kommer man tilbake
  // med et navn (erNy) starter man på lek-steget, men kan gå tilbake til navn.
  const [steg, setSteg] = useState(erNy ? 1 : 0);
  const [pending, startTransition] = useTransition();
  const [feil, setFeil] = useState<string | null>(null);
  const [hover, setHover] = useState(false);

  const STEG_KEYS = ["navn", ...POST_NAVN];
  const total = STEG_KEYS.length;
  const key = STEG_KEYS[Math.min(steg, total - 1)];
  const filledSegments = steg + 1;

  // Auroraen langs kantene starter lilla og blir sakte til lilla + grønn
  // etter hvert som man kommer gjennom stegene. Midten forblir svart.
  const progress = total > 1 ? (filledSegments - 1) / (total - 1) : 0;

  const oppdater = (delta: Partial<Data>) => setData((d) => ({ ...d, ...delta }));
  const neste = () => setSteg((s) => s + 1);
  const tilbake = () => setSteg((s) => Math.max(0, s - 1));

  const fullfor = () => {
    setFeil(null);
    startTransition(async () => {
      const res = await fullforOnboarding({ navn, ...data });
      if (res && "feil" in res) setFeil(res.feil);
    });
  };

  return (
    <div
      className="relative isolate min-h-dvh w-full overflow-hidden"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Radial aurora som blir mer til stede utover i stegene, og puster/blurrer på hover */}
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
                    // Én kontinuerlig gradient fordelt over alle delene
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
                Ingen e-post eller passord — bare navnet ditt. Skriver du et navn
                du har brukt før, logger du rett inn igjen.
              </p>
              {erNy ? (
                // Inne i onboardingen: rediger navnet uten omlasting, så du
                // beholder resten av det du har fylt ut.
                <div className="mt-6">
                  <Input
                    autoFocus
                    value={navn}
                    onChange={(e) => setNavn(e.target.value)}
                    placeholder="F.eks. Ola Nordmann"
                    className="text-lg"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && navn.trim().length >= 2) neste();
                    }}
                  />
                  <Button
                    onClick={neste}
                    disabled={navn.trim().length < 2}
                    className="mt-5 w-full"
                  >
                    Neste
                    <ArrowRight size={18} />
                  </Button>
                </div>
              ) : (
                <form action={startOnboarding} className="mt-6">
                  <Input
                    name="navn"
                    autoFocus
                    required
                    minLength={2}
                    placeholder="F.eks. Ola Nordmann"
                    className="text-lg"
                  />
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
                onClick={() => oppdater({ fellesLek: !data.fellesLek })}
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
                    Alle er med, også du. Passer leker uten fast vert.
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
              tekst="Velg egenskapene leken din setter på prøve — én eller flere."
            >
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
                      <span className="text-base">{k.emoji}</span>
                      <span className="font-medium">{k.tittel}</span>
                    </button>
                  );
                })}
              </div>
              <NavRad
                tilbake={tilbake}
                neste={neste}
                nesteAktiv={data.kvaliteter.length > 0}
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

          {key === "oppsummering" && (
            <div>
              <p className="text-xs tracking-[0.3em] text-fg-faint uppercase">
                Nesten ferdig
              </p>
              <h1 className="mt-2 font-display text-3xl text-fg">
                Ser dette riktig ut?
              </h1>
              <dl className="mt-6 flex flex-col divide-y divide-line rounded-2xl border border-line bg-white/[0.03]">
                <Rad merke="Ditt navn" verdi={navn} />
                <Rad merke="Lek" verdi={data.lekNavn} />
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
