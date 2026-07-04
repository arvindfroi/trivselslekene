"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { LagFormat, OvelseType } from "@prisma/client";
import { fullforOnboarding, sjekkNavn } from "@/lib/actions/auth";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";

type Data = {
  navn: string;
  lekNavn: string;
  type: OvelseType;
  lagFormat: LagFormat;
  vertDeltar: boolean;
  lokasjon: string;
  beskrivelse: string;
};

const start: Data = {
  navn: "",
  lekNavn: "",
  type: "INDIVIDUELL",
  lagFormat: "PAR",
  vertDeltar: false,
  lokasjon: "",
  beskrivelse: "",
};

function byggSteg(data: Data): string[] {
  return [
    "navn",
    "lekNavn",
    "type",
    ...(data.type === "LAG" ? ["lagFormat"] : []),
    "vertDeltar",
    "lokasjon",
    "beskrivelse",
    "oppsummering",
  ];
}

const lagFormatTekst: Record<LagFormat, string> = {
  PAR: "Par (2 og 2)",
  TRIO: "Trekamp (3 og 3)",
  FLERE_LAG: "Flere lag mot hverandre",
};

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

export default function Onboarding() {
  const [data, setData] = useState<Data>(start);
  const [steg, setSteg] = useState(0);
  const [pending, startTransition] = useTransition();
  const [navnPending, startNavn] = useTransition();
  const [feil, setFeil] = useState<string | null>(null);
  const [navnFeil, setNavnFeil] = useState<string | null>(null);

  const steps = byggSteg(data);
  const key = steps[Math.min(steg, steps.length - 1)];
  const total = steps.length;

  const oppdater = (delta: Partial<Data>) => setData((d) => ({ ...d, ...delta }));
  const neste = () => setSteg((s) => s + 1);
  const tilbake = () => setSteg((s) => Math.max(0, s - 1));

  // Steg 1: finnes navnet logges du inn (server-redirect), ellers går vi videre.
  const submitNavn = (formData: FormData) => {
    setNavnFeil(null);
    startNavn(async () => {
      const res = await sjekkNavn(undefined, formData);
      if (res && "feil" in res) {
        setNavnFeil(res.feil);
        return;
      }
      if (res && "status" in res && res.status === "ny") {
        setData((d) => ({ ...d, navn: res.navn }));
        setSteg(1);
      }
    });
  };

  const fullfor = () => {
    setFeil(null);
    startTransition(async () => {
      const res = await fullforOnboarding(data);
      if (res && "feil" in res) setFeil(res.feil);
    });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-md flex-col justify-center px-5 py-10">
      {/* Framdrift */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= steg ? "bg-gradient-accent" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
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
              <form action={submitNavn} className="mt-6">
                <Input
                  name="navn"
                  autoFocus
                  required
                  minLength={2}
                  defaultValue={data.navn}
                  placeholder="F.eks. Ola Nordmann"
                  className="text-lg"
                />
                {navnFeil && (
                  <p className="mt-2 text-sm text-red-300">{navnFeil}</p>
                )}
                <Button
                  type="submit"
                  disabled={navnPending}
                  className="mt-5 w-full"
                >
                  {navnPending ? "Sjekker…" : "Fortsett"}
                  <ArrowRight size={18} />
                </Button>
              </form>
            </div>
          )}

          {key === "lekNavn" && (
            <StepShell
              steg={steg}
              total={total}
              hei={data.navn}
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

          {key === "type" && (
            <StepShell
              steg={steg}
              total={total}
              tittel="Individuell eller lag?"
              tekst="Konkurrerer hver deltaker for seg selv, eller i lag?"
            >
              <div className="flex flex-col gap-3">
                <ChoiceCard
                  valgt={data.type === "INDIVIDUELL"}
                  onClick={() => oppdater({ type: "INDIVIDUELL" })}
                  tittel="Individuell"
                  tekst="Hver deltaker konkurrerer alene."
                />
                <ChoiceCard
                  valgt={data.type === "LAG"}
                  onClick={() => oppdater({ type: "LAG" })}
                  tittel="Lag"
                  tekst="Deltakerne konkurrerer i lag mot hverandre."
                />
              </div>
              <NavRad tilbake={tilbake} neste={neste} nesteAktiv />
            </StepShell>
          )}

          {key === "lagFormat" && (
            <StepShell
              steg={steg}
              total={total}
              tittel="Hvordan er lagene fordelt?"
              tekst="Velg formatet som passer leken din."
            >
              <div className="flex flex-col gap-3">
                {(Object.keys(lagFormatTekst) as LagFormat[]).map((f) => (
                  <ChoiceCard
                    key={f}
                    valgt={data.lagFormat === f}
                    onClick={() => oppdater({ lagFormat: f })}
                    tittel={lagFormatTekst[f]}
                  />
                ))}
              </div>
              <NavRad tilbake={tilbake} neste={neste} nesteAktiv />
            </StepShell>
          )}

          {key === "vertDeltar" && (
            <StepShell
              steg={steg}
              total={total}
              tittel="Skal du delta selv?"
              tekst="Vanligvis er verten dommer i sin egen lek og deltar ikke — men du bestemmer."
            >
              <div className="flex flex-col gap-3">
                <ChoiceCard
                  valgt={!data.vertDeltar}
                  onClick={() => oppdater({ vertDeltar: false })}
                  tittel="Nei, jeg er bare vert"
                  tekst="Du arrangerer leken, men konkurrerer ikke i den."
                />
                <ChoiceCard
                  valgt={data.vertDeltar}
                  onClick={() => oppdater({ vertDeltar: true })}
                  tittel="Ja, jeg deltar også"
                  tekst="Du er både vert og deltaker i denne leken."
                />
              </div>
              <NavRad tilbake={tilbake} neste={neste} nesteAktiv />
            </StepShell>
          )}

          {key === "lokasjon" && (
            <StepShell
              steg={steg}
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
              steg={steg}
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
                <Rad merke="Ditt navn" verdi={data.navn} />
                <Rad merke="Lek" verdi={data.lekNavn} />
                <Rad
                  merke="Type"
                  verdi={
                    data.type === "LAG"
                      ? `Lag — ${lagFormatTekst[data.lagFormat]}`
                      : "Individuell"
                  }
                />
                <Rad
                  merke="Du deltar"
                  verdi={data.vertDeltar ? "Ja" : "Nei, kun vert"}
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
        </motion.div>
      </AnimatePresence>
    </div>
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
        Steg {steg + 1} av {total}
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
  nesteTekst = "Neste",
  hoppOver = false,
}: {
  tilbake: () => void;
  neste: () => void;
  nesteAktiv: boolean;
  nesteTekst?: string;
  hoppOver?: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <Button variant="outline" onClick={tilbake} className="px-4">
        <ArrowLeft size={18} />
        Tilbake
      </Button>
      {hoppOver && !nesteAktiv ? (
        <Button variant="secondary" onClick={neste} className="flex-1">
          Hopp over
        </Button>
      ) : (
        <Button onClick={neste} disabled={!nesteAktiv} className="flex-1">
          {nesteTekst}
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
