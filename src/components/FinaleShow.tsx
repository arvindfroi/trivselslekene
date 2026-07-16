"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  LineChart,
  MoveRight,
  PartyPopper,
  Sparkles,
  Table2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import IridiserendeBakgrunn from "@/components/IridiserendeBakgrunn";
import { ShowLyd } from "@/lib/showLyd";
import { byggSlides, type Slide } from "@/lib/finaleSlides";
import {
  FJORARET_AAR,
  FJORARET_NAVN,
  FJORARET_SPILTE_LEKER,
  fjoraretStilling,
  fjorFarge,
} from "@/lib/fjoraaret";
import type {
  AvvikInnslag,
  DuellInnslag,
  FinaleData,
  FinaleDeltaker,
  Innslag,
  LedertroyeInnslag,
  PodiumInnslag,
  PoengfestInnslag,
  ReiseInnslag,
  RekordInnslag,
  RivalInnslag,
  Pris,
  TetsjiktInnslag,
  TidslinjePerson,
  TvillingInnslag,
  Vendepunkt,
} from "@/lib/finale";

/** Deltakerfargene er mørke (laget for hvit tekst) — lysnes for streker og bånd */
function lysFarge(farge?: string | null): string {
  return farge ? `color-mix(in srgb, ${farge} 50%, white)` : "var(--accent-2)";
}

/** Signaturgradienten, til per-bokstav-bruk i kinetiske titler */
const GRADIENT =
  "linear-gradient(100deg, var(--accent) 0%, var(--accent) 30%, var(--accent-2) 50%, var(--accent-3) 70%, var(--accent-3) 100%)";

/** Tittel som bygges bokstav for bokstav ved å animere fontaksene i
 *  Amstelvar (wght/wdth/opsz) — se @keyframes bokstav-boom. Gradienten
 *  fordeles over hele ordet ved å forskyve background-position per bokstav. */
function KinetiskTittel({
  tekst,
  className = "",
  delay = 0.15,
  steg = 0.045,
  gradient = false,
}: {
  tekst: string;
  className?: string;
  delay?: number;
  steg?: number;
  gradient?: boolean;
}) {
  const bokstaver = [...tekst];
  const n = bokstaver.length;
  return (
    <span className={className} aria-label={tekst} role="text">
      {bokstaver.map((b, i) => (
        <span
          key={i}
          aria-hidden
          className="kinetisk-bokstav"
          style={{
            animationDelay: `${delay + i * steg}s`,
            ...(gradient
              ? {
                  backgroundImage: GRADIENT,
                  backgroundSize: `${n * 100}% 100%`,
                  backgroundPosition: n > 1 ? `${(i / (n - 1)) * 100}% 0` : "0 0",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }
              : {}),
          }}
        >
          {b === " " ? " " : b}
        </span>
      ))}
    </span>
  );
}

// ─── Hovedkomponent ──────────────────────────────────────────────

/** Glødfarger per slide — bakgrunnen skifter stemning med innslaget */
function slideGlod(slide: Slide): [string, string] {
  const GULL = "#fbbf24";
  const GRONN = "#16b823";
  const BLAA = "#65aef7";
  const LILLA = "#8c27d9";
  const ROD = "#f87171";
  switch (slide.type) {
    case "innslag":
      switch (slide.innslag.slag) {
        case "duell":
        case "rekord":
        case "ledertroye":
          return [GULL, LILLA];
        case "comeback":
          return [GRONN, BLAA];
        case "fall":
          return [ROD, LILLA];
        case "poengfest":
          return [GULL, GRONN];
        case "podium":
          return [GULL, BLAA];
        case "tetsjikt":
          return [ROD, BLAA];
        default:
          return [LILLA, BLAA];
      }
    case "ifjor":
      return [GULL, BLAA];
    case "pris":
    case "hederlig":
    case "vendepunkt":
    case "trommevirvel":
      return [GULL, LILLA];
    case "vinner":
      return [GULL, GRONN];
    case "vifte":
    case "tidslinje":
    case "tallene":
      return [BLAA, LILLA];
    default:
      return [LILLA, GRONN];
  }
}

/** Ulik inn/ut-overgang per slidetype så bevegelsen mellom slides ikke blir
 *  den samme hver gang: tittelkort skalerer inn, klimaks zoomer, finalen
 *  stiger opp, resten skyves horisontalt. */
function slideOvergang(type: Slide["type"], retning: number) {
  switch (type) {
    case "intro":
    case "kapittel":
    case "ifjor":
      // Tittelkort: skalerer opp og fader inn
      return {
        initial: { opacity: 0, scale: 0.9, filter: "blur(8px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 1.04, filter: "blur(8px)" },
        transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
      };
    case "trommevirvel":
    case "vinner":
      // Klimaks: zoomer inn mot seeren
      return {
        initial: { opacity: 0, scale: 1.08 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.94 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };
    case "tallene":
      // Finalen: stiger opp
      return {
        initial: { opacity: 0, y: 40 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -40 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };
    default:
      // Standard horisontal dytt (i navigasjonsretningen)
      return {
        initial: { opacity: 0, x: retning * 60, scale: 0.98 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: retning * -60, scale: 0.98 },
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
      };
  }
}

export default function FinaleShow({ data }: { data: FinaleData }) {
  const slides = useMemo(() => byggSlides(data), [data]);
  const [index, setIndex] = useState(0);
  const [retning, setRetning] = useState(1);
  // Lar tidslinje-sliden "spise" første Neste-trykk for å hoppe til siste steg
  const tidslinjeRef = useRef<{ hoppTilSlutt: () => boolean } | null>(null);
  // Lydmotoren lever gjennom hele showet; demping er ett klikk.
  // Lat initialisering via useState så instansen lages nøyaktig én gang.
  const [lyd] = useState(() => new ShowLyd());
  const [dempet, setDempet] = useState(false);

  const neste = useCallback(() => {
    const slide = slides[index];
    if (slide?.type === "tidslinje" && tidslinjeRef.current?.hoppTilSlutt()) {
      return;
    }
    setRetning(1);
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [index, slides]);

  const forrige = useCallback(() => {
    setRetning(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "Enter", "PageDown"].includes(e.key)) {
        e.preventDefault();
        neste();
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        forrige();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [neste, forrige]);

  if (data.deltakere.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <PartyPopper size={40} className="text-fg-faint" />
        <h1 className="font-display text-3xl text-fg">Showet må vente litt</h1>
        <p className="max-w-md text-sm text-fg-dim">
          Ingen resultater er registrert i {data.sesongNavn} ennå. Fullfør noen
          leker, så står finaleshowet klart!
        </p>
        <Link href="/stilling" className="mt-2 text-sm text-accent-2 underline">
          Tilbake til statistikken
        </Link>
      </div>
    );
  }

  const slide = slides[index];
  const [glodA, glodB] = slideGlod(slide);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      {/* Iriserende flettede bånd på showets ytterpunkter: åpningen og kåringen */}
      <AnimatePresence>
        {(slide.type === "intro" || slide.type === "vinner") && (
          <motion.div
            key="irid"
            className="pointer-events-none absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
          >
            <IridiserendeBakgrunn />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Levende bakgrunnsdybde: to glød-blobs som driver og skifter
          farge i takt med innslaget */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute h-[75vh] w-[75vh] rounded-full blur-[140px]"
          style={{ top: "-28vh", left: "6vw" }}
          animate={{
            backgroundColor: glodA,
            x: Math.sin(index * 1.7) * 110,
            y: Math.sin(index * 0.9) * 50,
            opacity: 0.17,
          }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute h-[65vh] w-[65vh] rounded-full blur-[140px]"
          style={{ bottom: "-26vh", right: "4vw" }}
          animate={{
            backgroundColor: glodB,
            x: Math.sin(index * 2.3) * -120,
            y: Math.sin(index * 1.3) * -40,
            opacity: 0.14,
          }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
      </div>

      {/* Lyd av/på + avslutt-kryss */}
      <button
        onClick={() => {
          const d = !dempet;
          setDempet(d);
          lyd.settDempet(d);
        }}
        aria-label={dempet ? "Slå på lyd" : "Slå av lyd"}
        className="absolute right-16 top-5 z-20 rounded-full border border-line bg-bg-elev/70 p-2 text-fg-dim transition-colors hover:text-fg"
      >
        {dempet ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <Link
        href="/stilling"
        aria-label="Avslutt finaleshowet"
        className="absolute right-5 top-5 z-20 rounded-full border border-line bg-bg-elev/70 p-2 text-fg-dim transition-colors hover:text-fg"
      >
        <X size={18} />
      </Link>

      {/* Selve sliden */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
        <AnimatePresence mode="wait" custom={retning}>
          <motion.div
            key={slide.key}
            custom={retning}
            {...slideOvergang(slide.type, retning)}
            className="w-full max-w-5xl"
          >
            {slide.type === "intro" && <IntroSlide data={data} />}
            {slide.type === "ifjor" && <IfjorSlide data={data} />}
            {slide.type === "vifte" && <VifteSlide data={data} />}
            {slide.type === "kapittel" && (
              <KapittelSlide nr={slide.nr} tittel={slide.tittel} tekst={slide.tekst} />
            )}
            {slide.type === "innslag" && (
              <InnslagSlide innslag={slide.innslag} data={data} />
            )}
            {slide.type === "pris" && (
              <PrisSlide pris={slide.pris} data={data} lyd={lyd} />
            )}
            {slide.type === "hederlig" && <HederligSlide data={data} />}
            {slide.type === "vendepunkt" && (
              <VendepunktSlide vendepunkt={slide.vendepunkt} data={data} />
            )}
            {slide.type === "tidslinje" && (
              <TidslinjeSlide data={data} kontrollRef={tidslinjeRef} lyd={lyd} />
            )}
            {slide.type === "trommevirvel" && (
              <TrommevirvelSlide data={data} lyd={lyd} />
            )}
            {slide.type === "vinner" && (
              <VinnerSlide deltaker={slide.deltaker} data={data} lyd={lyd} />
            )}
            {slide.type === "tallene" && <TalleneSlide data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Kontroller: Forrige / fremdrift / Neste ─────────────── */}
      <div className="relative z-20 flex items-center justify-between gap-4 px-6 pb-6 sm:px-10">
        <button
          onClick={forrige}
          disabled={index === 0}
          className="flex min-h-[52px] items-center gap-2 rounded-full border border-line bg-bg-elev/80 px-6 py-3 text-sm font-medium text-fg backdrop-blur transition-all hover:border-line-strong hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={18} />
          Forrige
        </button>

        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
          {slides.map((s, i) => (
            <span
              key={s.key}
              className={
                i === index
                  ? "h-1.5 w-6 rounded-full bg-gradient-accent transition-all"
                  : "h-1.5 w-1.5 rounded-full bg-white/20 transition-all"
              }
            />
          ))}
        </div>

        <button
          onClick={neste}
          disabled={index === slides.length - 1}
          className="flex min-h-[52px] items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_36px_-10px_rgba(22,184,35,0.65)] transition-all hover:brightness-110 disabled:pointer-events-none disabled:opacity-30"
        >
          Neste
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

/** Ruter hvert innslag til riktig visualisering */
function InnslagSlide({ innslag, data }: { innslag: Innslag; data: FinaleData }) {
  switch (innslag.slag) {
    case "duell":
      return <DuellSlide innslag={innslag} data={data} />;
    case "comeback":
      return <ComebackSlide innslag={innslag} data={data} />;
    case "fall":
      return <FallSlide innslag={innslag} data={data} />;
    case "rekord":
      return <RekordSlide innslag={innslag} data={data} />;
    case "rival":
      return <RivalSlide innslag={innslag} data={data} />;
    case "ledertroye":
      return <LedertroyeSlide innslag={innslag} data={data} />;
    case "avvik":
      return <AvvikSlide innslag={innslag} data={data} />;
    case "tvillinger":
      return <TvillingSlide innslag={innslag} data={data} />;
    case "podium":
      return <PodiumSlide innslag={innslag} data={data} />;
    case "poengfest":
      return <PoengfestSlide innslag={innslag} data={data} />;
    case "tetsjikt":
      return <TetsjiktSlide innslag={innslag} data={data} />;
  }
}

// ─── Felles byggeklosser ─────────────────────────────────────────

function Kicker({ emoji, tittel, farge }: { emoji: string; tittel: string; farge?: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="inline-flex items-center gap-2.5 rounded-full border px-5 py-2 text-xs font-semibold tracking-[0.3em] uppercase backdrop-blur"
      style={{
        color: farge ?? "var(--accent-2)",
        borderColor: "color-mix(in srgb, currentColor 35%, transparent)",
        backgroundColor: "color-mix(in srgb, currentColor 9%, transparent)",
        boxShadow: "0 0 36px -10px currentColor",
      }}
    >
      <span className="text-base tracking-normal">{emoji}</span>
      <span className="kicker-strekk">{tittel}</span>
    </motion.p>
  );
}

function PersonHeader({
  userId,
  data,
  delay = 0.2,
  ring,
}: {
  userId: string;
  data: FinaleData;
  delay?: number;
  ring?: string;
}) {
  const person = data.personer[userId];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 18 }}
      className="mt-5 flex items-center justify-center gap-4"
    >
      <Avatar
        navn={person?.navn ?? "?"}
        bildeUrl={person?.bildeUrl}
        farge={person?.farge}
        size={72}
        className={ring}
      />
      <h2 className="font-display text-4xl text-fg sm:text-5xl">
        {person?.fornavn ?? "?"}
      </h2>
    </motion.div>
  );
}

function SlideTekst({ tekst, delay = 1.6 }: { tekst: string; delay?: number }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mx-auto mt-8 max-w-2xl text-lg text-fg-dim"
    >
      {tekst}
    </motion.p>
  );
}

// ─── Intro og kapittel ───────────────────────────────────────────

function IntroSlide({ data }: { data: FinaleData }) {
  return (
    <div className="text-center">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-sm tracking-[0.4em] text-accent-2 uppercase"
      >
        Mine damer og herrer
      </motion.p>
      <h1 className="mt-4 font-display text-6xl sm:text-8xl">
        <KinetiskTittel tekst={data.sesongNavn} gradient delay={0.3} steg={0.055} />
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-5 font-display text-2xl text-fg sm:text-3xl"
      >
        Historien om den store finalen 🎉
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="mt-6 text-sm text-fg-dim"
      >
        {data.antallFullfort} leker · {data.deltakere.length} deltakere ·
        utallige minner
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95 }}
        className="mt-2 text-sm text-fg-faint"
      >
        Tittelforsvarer fra {FJORARET_AAR}:{" "}
        <span className="text-[var(--gold)]">{fjoraretStilling()[0].navn}</span> 👑
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-10 text-xs tracking-widest text-fg-faint uppercase"
      >
        Trykk Neste eller → for å starte showet
      </motion.p>
    </div>
  );
}

// ─── Tilbakeblikk: fjorårets pall som en «tidligere i lekene»-vignett ─

/** Kobler et fjorårsnavn til årets deltaker med samme fornavn — så vi kan
 *  gjenbruke profilbilde og farge når personen fortsatt er med. Faller ellers
 *  tilbake på fjorårets egen farge og initial-avatar. */
function IfjorSlide({ data }: { data: FinaleData }) {
  const stilling = useMemo(() => fjoraretStilling(), []);
  const fornavnKart = useMemo(() => {
    const kart = new Map<string, TidslinjePerson>();
    for (const p of Object.values(data.personer)) {
      kart.set(p.fornavn.toLowerCase(), p);
    }
    return kart;
  }, [data.personer]);

  const topp = stilling.slice(0, 3);
  const forsprang = topp.length >= 2 ? topp[0].totalPoeng - topp[1].totalPoeng : 0;
  // Pall: 2. til venstre, 1. i midten, 3. til høyre
  const pall = [
    { rad: topp[1], plass: 2, hoyde: 104, delay: 0.7 },
    { rad: topp[0], plass: 1, hoyde: 150, delay: 1.1 },
    { rad: topp[2], plass: 3, hoyde: 74, delay: 0.4 },
  ].filter((p) => p.rad);
  const MEDALJER = ["", "🥇", "🥈", "🥉"];

  const bildeOgFarge = (navn: string, fallbackFarge: string) => {
    const match = fornavnKart.get(navn.toLowerCase());
    return {
      bildeUrl: match?.bildeUrl ?? null,
      farge: match?.farge ?? fjorFarge(navn) ?? fallbackFarge,
    };
  };

  return (
    <div className="text-center">
      <Kicker emoji="🕰️" tittel={`Sist gang · ${FJORARET_AAR}`} farge="var(--gold)" />
      <h2 className="mt-4 font-display text-5xl sm:text-7xl">
        <KinetiskTittel tekst="Tilbakeblikk" gradient delay={0.2} steg={0.06} />
      </h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mx-auto mt-4 max-w-xl text-base text-fg-dim"
      >
        Før vi kårer årets mester — slik endte {FJORARET_NAVN}.
      </motion.p>

      <div className="mx-auto mt-10 flex max-w-2xl items-end justify-center gap-3 sm:gap-5">
        {pall.map(({ rad, plass, hoyde, delay }) => {
          const { bildeUrl, farge } = bildeOgFarge(rad.navn, rad.farge);
          const lys = lysFarge(farge);
          const gull = plass === 1;
          return (
            <div key={rad.navn} className="flex w-28 flex-col items-center sm:w-32">
              <motion.div
                initial={{ opacity: 0, y: -70, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: delay + 0.2, type: "spring", stiffness: 220, damping: 14 }}
                className="mb-2 flex flex-col items-center gap-1"
              >
                <span className="text-xl" aria-hidden>
                  {MEDALJER[plass]}
                </span>
                <Avatar
                  navn={rad.navn}
                  bildeUrl={bildeUrl}
                  farge={farge}
                  size={gull ? 72 : 56}
                  className={gull ? "ring-2 ring-[var(--gold)]" : ""}
                />
                <span className="font-display text-lg text-fg">{rad.navn}</span>
              </motion.div>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: hoyde, opacity: 1 }}
                transition={{ delay, type: "spring", stiffness: 130, damping: 17 }}
                className="flex w-full items-start justify-center rounded-t-2xl pt-2.5"
                style={{
                  background: gull
                    ? "linear-gradient(180deg, color-mix(in srgb, var(--gold) 85%, white), color-mix(in srgb, var(--gold) 68%, black))"
                    : `linear-gradient(180deg, color-mix(in srgb, ${lys} 76%, white), color-mix(in srgb, ${lys} 62%, black))`,
                  boxShadow: `inset 0 2px 0 rgba(255,255,255,0.4), 0 12px 36px -14px ${gull ? "var(--gold)" : lys}`,
                }}
              >
                <span className="font-display text-2xl font-bold text-black/70 tabular-nums">
                  {rad.totalPoeng}p
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7 }}
        className="mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-2.5 text-sm"
      >
        {[
          `${FJORARET_SPILTE_LEKER.length} leker`,
          forsprang === 0
            ? `Delt seier på topp`
            : `Kun ${forsprang}p mellom topp to`,
          "Ingen egenskaper — bare rå kamp",
          "«Marble lek» avgjorde mer enn noen trodde",
        ].map((t) => (
          <span
            key={t}
            className="rounded-full border border-line bg-white/[0.04] px-3.5 py-1.5 text-fg-dim"
          >
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Kortviften: årets felt som en hånd med spillkort ────────────

function VifteSlide({ data }: { data: FinaleData }) {
  // Alfabetisk — kortstokken skal ikke røpe sluttstillingen
  const spillere = useMemo(
    () => [...data.deltakere].sort((a, b) => a.fornavn.localeCompare(b.fornavn, "nb")),
    [data.deltakere],
  );
  const n = spillere.length;
  const midt = (n - 1) / 2;
  const spredning = Math.min(9, 64 / n);
  const [fokus, setFokus] = useState(-1);

  // Etter at kortene er delt ut, vandrer fokuset kort for kort —
  // som karusell-pagineringen i inspirasjonskomponenten
  useEffect(() => {
    const start = setTimeout(() => setFokus(0), 500 + n * 130 + 900);
    return () => clearTimeout(start);
  }, [n]);
  useEffect(() => {
    if (fokus < 0) return;
    const t = setTimeout(() => setFokus((f) => (f + 1) % n), 1500);
    return () => clearTimeout(t);
  }, [fokus, n]);

  return (
    <div className="text-center">
      <Kicker emoji="🎴" tittel="Årets felt" />
      <h2 className="mt-4 font-display text-5xl sm:text-7xl">
        <KinetiskTittel tekst="Deltakerne" gradient delay={0.2} steg={0.06} />
      </h2>

      <div className="mt-16 flex items-end justify-center" style={{ minHeight: 300 }}>
        {spillere.map((d, i) => {
          const lys = lysFarge(d.farge);
          const rot = (i - midt) * spredning;
          const aktivt = fokus === i;
          return (
            <motion.div
              key={d.userId}
              className="relative -ml-9 first:ml-0"
              style={{ transformOrigin: "50% 160%", zIndex: aktivt ? 30 : 10 + i }}
              initial={{ opacity: 0, y: 110, rotate: 0, scale: 0.7 }}
              animate={{
                opacity: 1,
                y: aktivt ? -26 : 0,
                rotate: rot,
                scale: aktivt ? 1.12 : 1,
              }}
              transition={{
                delay: fokus === -1 ? 0.5 + i * 0.13 : 0,
                type: "spring",
                stiffness: 170,
                damping: 15,
              }}
              onMouseEnter={() => setFokus(i)}
            >
              <div
                className="flex h-52 w-36 flex-col items-center justify-center gap-2.5 rounded-2xl border px-3"
                style={{
                  borderColor: aktivt
                    ? lys
                    : "color-mix(in srgb, var(--line-strong) 90%, transparent)",
                  background: `linear-gradient(180deg, color-mix(in srgb, ${lys} 26%, #101015), #0c0c11 70%)`,
                  boxShadow: aktivt
                    ? `0 20px 60px -18px ${lys}, inset 0 1px 0 rgba(255,255,255,0.22)`
                    : "0 16px 40px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              >
                <Avatar navn={d.navn} bildeUrl={d.bildeUrl} farge={d.farge} size={76} />
                <p className="font-display text-xl text-fg">{d.fornavn}</p>
                <p className="text-[11px] tracking-wider text-fg-faint uppercase">
                  {d.antallOvelser} leker
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 + n * 0.13 }}
        className="mt-12 text-lg text-fg-dim"
      >
        {n} deltakere · {data.antallFullfort} leker · én tittel
      </motion.p>
    </div>
  );
}

function KapittelSlide({ nr, tittel, tekst }: { nr: number; tittel: string; tekst: string }) {
  return (
    <div className="text-center">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm tracking-[0.4em] text-fg-faint uppercase"
      >
        Kapittel {nr}
      </motion.p>
      <h2 className="mt-4 font-display text-6xl sm:text-8xl">
        <KinetiskTittel tekst={tittel} gradient delay={0.2} steg={0.07} />
      </h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mt-5 font-display text-xl text-fg-dim sm:text-2xl"
      >
        {tekst}
      </motion.p>
    </div>
  );
}

// ─── Duell ───────────────────────────────────────────────────────

function DuellSlide({ innslag: o, data }: { innslag: DuellInnslag; data: FinaleData }) {
  const vinner = data.personer[o.vinner.userId];
  const taper = data.personer[o.taper.userId];
  const maks = Math.max(1, o.vinner.poeng);
  const diff = o.vinner.poeng - o.taper.poeng;
  const diffTekst =
    o.variant === "thriller" ? (diff === 0 ? "dødt løp!" : `bare ${diff}p!`) : `+${diff}p`;

  const rad = (
    person: typeof vinner,
    poeng: number,
    erVinner: boolean,
    delay: number,
  ) => {
    const lys = lysFarge(person?.farge);
    return (
      <motion.div
        initial={{ opacity: 0, x: erVinner ? -30 : 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="flex items-center gap-4"
      >
        <Avatar
          navn={person?.navn ?? "?"}
          bildeUrl={person?.bildeUrl}
          farge={person?.farge}
          size={56}
          className={erVinner ? "ring-2 ring-[var(--gold)]" : "opacity-80"}
        />
        <span className="w-28 truncate text-left text-lg font-medium text-fg sm:w-36">
          {person?.fornavn ?? "?"}
        </span>
        <div className="relative h-12 flex-1 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.04]">
          <motion.div
            className="relative flex h-full items-center justify-end overflow-hidden rounded-full pr-4"
            style={{
              background: erVinner
                ? "linear-gradient(90deg, color-mix(in srgb, var(--gold) 55%, #6b4e0d), var(--gold))"
                : `linear-gradient(90deg, color-mix(in srgb, ${lys} 22%, transparent), color-mix(in srgb, ${lys} 55%, transparent))`,
              boxShadow: erVinner
                ? "0 0 34px -6px color-mix(in srgb, var(--gold) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.35)"
                : "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(8, (poeng / maks) * 100)}%` }}
            transition={{ delay: delay + 0.25, type: "spring", stiffness: 90, damping: 20 }}
          >
            {/* Lysstripe som sveiper over vinnerbaren */}
            {erVinner && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(105deg, transparent, rgba(255,255,255,0.55), transparent)",
                }}
                initial={{ x: "-160%" }}
                animate={{ x: "380%" }}
                transition={{ delay: delay + 1.1, duration: 0.9, ease: "easeInOut" }}
              />
            )}
            <span
              className={`relative text-sm font-bold tabular-nums ${erVinner ? "text-black" : "text-fg"}`}
            >
              {poeng}p
            </span>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} />
      <h2 className="mt-4 font-display text-4xl text-fg sm:text-6xl">
        <KinetiskTittel tekst={`«${o.ovelseNavn}»`} delay={0.2} steg={0.035} />
      </h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-2 text-xs tracking-widest text-fg-faint uppercase"
      >
        Øvelse {o.ovelseNr} av {data.antallFullfort}
      </motion.p>

      <div className="relative mx-auto mt-10 flex max-w-3xl flex-col gap-4">
        {rad(vinner, o.vinner.poeng, true, 0.45)}
        {rad(taper, o.taper.poeng, false, 0.65)}
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: -14 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 14 }}
          className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 rounded-2xl border-2 border-[var(--gold)] bg-bg px-4 py-2 font-display text-2xl font-bold text-[var(--gold)] shadow-[0_0_40px_-8px_var(--gold)] sm:-right-8"
        >
          {diffTekst}
        </motion.div>
      </div>

      <SlideTekst tekst={o.tekst} delay={1.5} />
    </div>
  );
}

// ─── Posisjonsgraf (comeback og vendepunkt) ──────────────────────

function PosisjonsGraf({
  data,
  highlightId,
  strek,
  markerNr,
}: {
  data: FinaleData;
  highlightId: string;
  strek: string;
  markerNr?: number | null;
}) {
  const { posisjoner, personer } = data;
  const steg = posisjoner.ovelser.length;
  const antall = posisjoner.serier.length;
  const W = 860;
  const H = Math.min(400, 120 + antall * 34);
  const padL = 40;
  const padR = 120;
  const padT = 22;
  const padB = 34;

  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, steg - 1);
  const y = (r: number) => padT + ((r - 1) * (H - padT - padB)) / Math.max(1, antall - 1);

  const tilPunkter = (ranks: (number | null)[]) =>
    ranks
      .map((r, i) => (r === null ? null : ([x(i), y(r)] as const)))
      .filter((p): p is readonly [number, number] => p !== null);

  const tilPath = (pts: (readonly [number, number])[]) =>
    pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ");

  const highlight = posisjoner.serier.find((s) => s.userId === highlightId);
  const highlightPts = highlight ? tilPunkter(highlight.ranks) : [];
  const sisteRank = highlight?.ranks[highlight.ranks.length - 1] ?? null;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sistePunkt = highlightPts[highlightPts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto mt-8 w-full max-w-3xl"
      role="img"
      aria-label={`Plasseringen til ${personer[highlightId]?.fornavn ?? "?"} gjennom lekene`}
    >
      <defs>
        <linearGradient id={`pg-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={strek} stopOpacity="0.35" />
          <stop offset="60%" stopColor={strek} />
          <stop offset="100%" stopColor={`color-mix(in srgb, ${strek} 55%, white)`} />
        </linearGradient>
        <filter id={`gl-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={strek} floodOpacity="0.65" />
        </filter>
      </defs>

      {/* Prikket rutenett per plassering */}
      {Array.from({ length: antall }, (_, i) => i + 1).map((r) => (
        <line
          key={`grid-${r}`}
          x1={padL}
          x2={W - padR}
          y1={y(r)}
          y2={y(r)}
          stroke="rgba(255,255,255,0.07)"
          strokeDasharray="1 7"
          strokeLinecap="round"
        />
      ))}
      {Array.from({ length: antall }, (_, i) => i + 1)
        .filter((r) => antall <= 9 || r === 1 || r === antall || r % 2 === 1)
        .map((r) => (
          <text key={r} x={padL - 10} y={y(r) + 4} textAnchor="end" fontSize={12} fill="var(--fg-faint)">
            {r}.
          </text>
        ))}
      {Array.from({ length: steg }, (_, i) => (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--fg-faint)">
          {i + 1}
        </text>
      ))}

      {/* De andre deltakerne: svake spor i egne (lysnede) farger */}
      {posisjoner.serier
        .filter((s) => s.userId !== highlightId)
        .map((s) => {
          const pts = tilPunkter(s.ranks);
          if (pts.length === 0) return null;
          const spor = lysFarge(personer[s.userId]?.farge);
          return pts.length === 1 ? (
            <circle key={s.userId} cx={pts[0][0]} cy={pts[0][1]} r={3} fill={spor} opacity={0.2} />
          ) : (
            <path
              key={s.userId}
              d={tilPath(pts)}
              fill="none"
              stroke={spor}
              strokeOpacity={0.16}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

      {/* Hovedpersonens reise: bred glød-skygge under en gradientlinje */}
      {highlightPts.length >= 2 && (
        <>
          <motion.path
            d={tilPath(highlightPts)}
            fill="none"
            stroke={strek}
            strokeOpacity={0.16}
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 1.8, ease: "easeInOut" }}
          />
          <motion.path
            d={tilPath(highlightPts)}
            fill="none"
            stroke={`url(#pg-${uid})`}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#gl-${uid})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 1.8, ease: "easeInOut" }}
          />
        </>
      )}
      {highlightPts.map(([px, py], i) => (
        <motion.circle
          key={i}
          cx={px}
          cy={py}
          r={5.5}
          fill={strek}
          stroke="var(--bg)"
          strokeWidth={2}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 + (i / Math.max(1, highlightPts.length - 1)) * 1.8 }}
        />
      ))}
      {/* Pulserende halo rundt sluttpunktet */}
      {sistePunkt && (
        <motion.circle
          cx={sistePunkt[0]}
          cy={sistePunkt[1]}
          r={7}
          fill="none"
          stroke={strek}
          strokeWidth={2.5}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.8, 0], scale: [1, 2.6] }}
          transition={{ delay: 2.4, duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {markerNr != null && markerNr >= 1 && markerNr <= steg && highlight?.ranks[markerNr - 1] != null && (
        <motion.circle
          cx={x(markerNr - 1)}
          cy={y(highlight.ranks[markerNr - 1]!)}
          r={13}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={3}
          initial={{ opacity: 0, scale: 2.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.2, type: "spring", stiffness: 200, damping: 16 }}
        />
      )}

      {highlightPts.length > 0 && sisteRank !== null && (
        <motion.text
          x={highlightPts[highlightPts.length - 1][0] + 14}
          y={highlightPts[highlightPts.length - 1][1] + 5}
          fontSize={15}
          fontWeight={600}
          fill="var(--fg)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3 }}
        >
          {personer[highlightId]?.fornavn ?? "?"} · {sisteRank}.
        </motion.text>
      )}
    </svg>
  );
}

function ComebackSlide({ innslag: o, data }: { innslag: ReiseInnslag; data: FinaleData }) {
  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} />
      <PersonHeader userId={o.userId} data={data} />
      <PosisjonsGraf data={data} highlightId={o.userId} strek="var(--accent)" />
      <SlideTekst tekst={o.tekst} delay={2.4} />
    </div>
  );
}

// ─── Fallet: avatar som stuper fra hylle til hylle ───────────────

function FallSlide({ innslag: o, data }: { innslag: ReiseInnslag; data: FinaleData }) {
  const person = data.personer[o.userId];
  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} farge="#f87171" />
      <PersonHeader userId={o.userId} data={data} />

      <div className="relative mx-auto mt-10 h-[240px] w-[440px] max-w-full">
        {/* Startplatå oppe til venstre */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="absolute left-0 top-0 w-32 rounded-2xl border border-line bg-bg-elev/80 px-4 py-3"
        >
          <p className="font-display text-4xl text-fg tabular-nums">{o.fra}.</p>
          <p className="text-[11px] tracking-wider text-fg-faint uppercase">var her</p>
        </motion.div>
        {/* Sluttplatå nede til høyre */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-0 right-0 w-32 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3"
        >
          <p className="font-display text-4xl text-red-300 tabular-nums">{o.til}.</p>
          <p className="text-[11px] tracking-wider text-red-300/70 uppercase">endte her</p>
        </motion.div>

        {/* Stiplet fallkurve */}
        <svg viewBox="0 0 440 240" className="absolute inset-0 h-full w-full" aria-hidden>
          <motion.path
            d="M 64 -8 C 180 0, 290 60, 330 150"
            fill="none"
            stroke="#f87171"
            strokeWidth={2.5}
            strokeDasharray="7 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.9, duration: 1.3, ease: "easeIn" }}
          />
        </svg>

        {/* Avataren stuper */}
        <motion.div
          className="absolute left-8 -top-16"
          initial={{ x: 0, y: 0, rotate: 0 }}
          animate={{ x: [0, 60, 230, 265], y: [0, -14, 90, 152], rotate: [0, 30, 110, 150] }}
          transition={{ delay: 0.9, duration: 1.4, times: [0, 0.25, 0.75, 1], ease: "easeIn" }}
        >
          <Avatar
            navn={person?.navn ?? "?"}
            bildeUrl={person?.bildeUrl}
            farge={person?.farge}
            size={56}
          />
        </motion.div>

        {/* Støvsky ved landing */}
        <motion.span
          className="absolute bottom-2 right-36 text-3xl"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.4, 1.8] }}
          transition={{ delay: 2.25, duration: 0.9 }}
          aria-hidden
        >
          💨
        </motion.span>
      </div>

      <SlideTekst tekst={o.tekst} delay={2.6} />
    </div>
  );
}

// ─── Rekorden: telleverk ─────────────────────────────────────────

function RekordSlide({ innslag: o, data }: { innslag: RekordInnslag; data: FinaleData }) {
  const [vis, setVis] = useState(0);
  useEffect(() => {
    const kontroll = animate(0, o.poeng, {
      delay: 0.7,
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => setVis(v),
    });
    return () => kontroll.stop();
  }, [o.poeng]);

  // Fontvekten følger telleren: tallet blir bokstavelig talt tyngre og
  // tyngre — Amstelvar går fra wght 150 til 900 mens verdien teller opp.
  const andel = o.poeng > 0 ? vis / o.poeng : 1;
  const vekt = Math.round(150 + andel * 750);

  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} farge="var(--gold)" />
      <PersonHeader userId={o.userId} data={data} />
      <motion.p
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, type: "spring", stiffness: 160, damping: 16 }}
        className="text-gradient mt-6 font-display text-[9rem] leading-none tabular-nums sm:text-[12rem]"
        style={{
          fontVariationSettings: `"wght" ${vekt}, "opsz" 144`,
          filter: `drop-shadow(0 0 ${Math.round(andel * 42)}px color-mix(in srgb, var(--gold) 40%, transparent))`,
        }}
      >
        {Math.round(vis)}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-2 font-display text-2xl text-fg"
      >
        poeng i «{o.ovelseNavn}»
      </motion.p>
      <SlideTekst tekst={o.tekst} delay={2.2} />
    </div>
  );
}

// ─── Rivaloppgjøret ──────────────────────────────────────────────

function RivalSlide({ innslag: o, data }: { innslag: RivalInnslag; data: FinaleData }) {
  const a = data.personer[o.aId];
  const b = data.personer[o.bId];
  const fargeA = lysFarge(a?.farge);
  const fargeB = lysFarge(b?.farge);
  const scoreDelay = 0.8 + o.runder.length * 0.18;

  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} />

      <div className="mt-7 flex items-center justify-center gap-6 sm:gap-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-2"
        >
          <Avatar navn={a?.navn ?? "?"} bildeUrl={a?.bildeUrl} farge={a?.farge} size={84} />
          <p className="font-display text-2xl text-fg">{a?.fornavn ?? "?"}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: scoreDelay, type: "spring", stiffness: 200, damping: 14 }}
          className="font-display text-6xl font-bold text-fg tabular-nums sm:text-7xl"
        >
          <span style={{ color: fargeA }}>{o.aSeire}</span>
          <span className="mx-3 text-fg-faint">–</span>
          <span style={{ color: fargeB }}>{o.bSeire}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-2"
        >
          <Avatar navn={b?.navn ?? "?"} bildeUrl={b?.bildeUrl} farge={b?.farge} size={84} />
          <p className="font-display text-2xl text-fg">{b?.fornavn ?? "?"}</p>
        </motion.div>
      </div>

      {/* Runde for runde */}
      <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
        {o.runder.map((r, i) => {
          const vinnerFarge = r.utfall === "A" ? fargeA : r.utfall === "B" ? fargeB : "var(--fg-faint)";
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 14, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.18, type: "spring", stiffness: 260, damping: 18 }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: `color-mix(in srgb, ${vinnerFarge} 45%, transparent)`,
                color: vinnerFarge,
                backgroundColor: `color-mix(in srgb, ${vinnerFarge} 10%, transparent)`,
              }}
            >
              {r.utfall === "A" ? "◀" : r.utfall === "B" ? "▶" : "＝"} {r.ovelseNavn}
            </motion.span>
          );
        })}
      </div>

      <SlideTekst tekst={o.tekst} delay={scoreDelay + 0.4} />
    </div>
  );
}

// ─── Ledertrøya: fargebånd over etappene ─────────────────────────

function LedertroyeSlide({ innslag: o, data }: { innslag: LedertroyeInnslag; data: FinaleData }) {
  const { tidslinje, personer } = data;
  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} farge="var(--gold)" />
      <PersonHeader userId={o.userId} data={data} ring="ring-2 ring-[var(--gold)]" />

      <div className="mx-auto mt-14 max-w-3xl">
        <div className="flex h-16 gap-1.5">
          {tidslinje.map((steg, i) => {
            const leder = steg.lederId ? personer[steg.lederId] : null;
            const lys = lysFarge(leder?.farge);
            return (
              <motion.div
                key={steg.nr}
                className="relative flex-1 rounded-xl"
                style={{
                  background: steg.lederId
                    ? `linear-gradient(180deg, color-mix(in srgb, ${lys} 80%, white), ${lys} 45%, color-mix(in srgb, ${lys} 72%, black))`
                    : "rgba(255,255,255,0.06)",
                  boxShadow: steg.lederId
                    ? `inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 22px -8px ${lys}`
                    : "none",
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.16, duration: 0.3, ease: "easeOut" }}
              >
                {/* Ny eier av trøya: avatar over segmentet */}
                {steg.lederbytte && steg.lederId && (
                  <motion.span
                    className="absolute -top-12 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: 8, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.16, type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <Avatar
                      navn={leder?.navn ?? "?"}
                      bildeUrl={leder?.bildeUrl}
                      farge={leder?.farge}
                      size={36}
                    />
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>
        <div className="mt-2 flex">
          {tidslinje.map((steg) => (
            <span key={steg.nr} className="flex-1 text-center text-[10px] text-fg-faint tabular-nums">
              {steg.nr}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] tracking-wider text-fg-faint uppercase">
          Etappe for etappe — fargen viser hvem som ledet sammendraget
        </p>
      </div>

      <SlideTekst tekst={o.tekst} delay={0.7 + tidslinje.length * 0.16} />
    </div>
  );
}

// ─── Avvik: sjokkresultatet / sluttspurten ───────────────────────

function AvvikSlide({ innslag: o, data }: { innslag: AvvikInnslag; data: FinaleData }) {
  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} />
      <PersonHeader userId={o.userId} data={data} />

      <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-4 sm:gap-8">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="w-48 rounded-3xl border border-line bg-bg-elev/70 px-5 py-6 opacity-80"
        >
          <p className="font-display text-6xl text-fg-dim tabular-nums">{o.fraVerdi}</p>
          <p className="mt-2 text-[11px] tracking-wider text-fg-faint uppercase">{o.fraLabel}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 240, damping: 15 }}
        >
          <MoveRight size={44} className="text-accent-2" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1, type: "spring", stiffness: 200, damping: 16 }}
          className="w-48 rounded-3xl border-2 border-accent-2/60 bg-accent-2/10 px-5 py-6 shadow-[0_0_50px_-14px_var(--accent-2)]"
        >
          <p className="font-display text-6xl text-accent-2 tabular-nums">{o.tilVerdi}</p>
          <p className="mt-2 text-[11px] tracking-wider text-accent-2/70 uppercase">{o.tilLabel}</p>
        </motion.div>
      </div>

      <SlideTekst tekst={o.tekst} delay={1.7} />
    </div>
  );
}

// ─── Tvillingene / Motpolene: doble kurver ───────────────────────

function TvillingSlide({ innslag: o, data }: { innslag: TvillingInnslag; data: FinaleData }) {
  const a = data.personer[o.aId];
  const b = data.personer[o.bId];
  const fargeA = lysFarge(a?.farge);
  const fargeB = lysFarge(b?.farge);

  const W = 640;
  const H = 190;
  const pad = 24;
  const n = Math.min(o.aRanks.length, o.bRanks.length);
  const alle = [...o.aRanks.slice(0, n), ...o.bRanks.slice(0, n)];
  const min = Math.min(...alle);
  const maks = Math.max(...alle);
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1);
  const y = (r: number) =>
    maks === min ? H / 2 : pad + ((r - min) * (H - 2 * pad)) / (maks - min);
  const path = (ranks: number[]) =>
    ranks
      .slice(0, n)
      .map((r, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(r)}`)
      .join(" ");

  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} farge="var(--accent-3)" />

      <div className="mt-6 flex items-center justify-center gap-5">
        {[
          { p: a, farge: fargeA },
          { p: b, farge: fargeB },
        ].map(({ p, farge }, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 220, damping: 18 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-elev/70 py-1.5 pl-1.5 pr-4"
          >
            <Avatar navn={p?.navn ?? "?"} bildeUrl={p?.bildeUrl} farge={p?.farge} size={34} />
            <span className="text-lg font-medium" style={{ color: farge }}>
              {p?.fornavn ?? "?"}
            </span>
          </motion.span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto mt-8 w-full max-w-xl" aria-hidden>
        <defs>
          <filter id={`tv-a-${o.aId}`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={fargeA} floodOpacity="0.6" />
          </filter>
          <filter id={`tv-b-${o.bId}`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={fargeB} floodOpacity="0.6" />
          </filter>
        </defs>
        {/* Loddrette bånd som binder kurvene sammen per lek */}
        {Array.from({ length: n }, (_, i) => (
          <line
            key={`tikk-${i}`}
            x1={x(i)}
            x2={x(i)}
            y1={pad - 6}
            y2={H - pad + 6}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
        ))}
        {[o.aRanks, o.bRanks].map((ranks, serie) => (
          <motion.path
            key={serie}
            d={path(ranks)}
            fill="none"
            stroke={serie === 0 ? fargeA : fargeB}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#tv-${serie === 0 ? "a" : "b"}-${serie === 0 ? o.aId : o.bId})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6 + serie * 0.5, duration: 1.4, ease: "easeInOut" }}
          />
        ))}
        {[o.aRanks, o.bRanks].map((ranks, serie) =>
          ranks.slice(0, n).map((r, i) => (
            <motion.circle
              key={`${serie}-${i}`}
              cx={x(i)}
              cy={y(r)}
              r={5}
              fill={serie === 0 ? fargeA : fargeB}
              stroke="var(--bg)"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + serie * 0.5 + (i / Math.max(1, n - 1)) * 1.4 }}
            />
          )),
        )}
      </svg>
      <p className="mt-1 text-[11px] tracking-wider text-fg-faint uppercase">
        Plassering i lekene begge deltok i (øverst = best)
      </p>

      <motion.span
        initial={{ opacity: 0, scale: 0.5, rotate: 6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 2.6, type: "spring", stiffness: 240, damping: 14 }}
        className="mt-5 inline-block rounded-full border-2 border-accent-3/60 bg-accent-3/10 px-5 py-2 font-display text-xl font-bold text-accent-3"
      >
        {o.prosent} % {o.variant === "tvillinger" ? "samsvar" : "motsatt"}
      </motion.span>

      <SlideTekst tekst={o.tekst} delay={3} />
    </div>
  );
}

// ─── Kvalitetspallen: Mario Party-podium for topp tre ────────────

function PodiumSlide({ innslag: o, data }: { innslag: PodiumInnslag; data: FinaleData }) {
  // Podiumrekkefølge: 2. plass til venstre, 1. i midten, 3. til høyre
  const plassering = [
    { deltager: o.topp[1], plass: 2, hoyde: 132, delay: 0.9 },
    { deltager: o.topp[0], plass: 1, hoyde: 190, delay: 1.5 },
    { deltager: o.topp[2], plass: 3, hoyde: 92, delay: 0.5 },
  ];
  const MEDALJER = ["", "🥇", "🥈", "🥉"];

  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel="Kvalitetspallen" farge="var(--gold)" />
      <h2 className="mt-4 font-display text-5xl sm:text-7xl">
        <KinetiskTittel tekst={o.kvalitet} gradient delay={0.2} steg={0.06} />
      </h2>

      <div className="mx-auto mt-12 flex max-w-2xl items-end justify-center gap-3">
        {plassering.map(({ deltager, plass, hoyde, delay }) => {
          const person = data.personer[deltager.userId];
          const lys = lysFarge(person?.farge);
          const gull = plass === 1;
          return (
            <div key={deltager.userId} className="flex w-40 flex-col items-center">
              {/* Avataren hopper ned på pallen */}
              <motion.div
                initial={{ opacity: 0, y: -90, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: delay + 0.25, type: "spring", stiffness: 220, damping: 13 }}
                className="mb-3 flex flex-col items-center gap-1.5"
              >
                <span className="text-2xl" aria-hidden>
                  {MEDALJER[plass]}
                </span>
                <Avatar
                  navn={person?.navn ?? "?"}
                  bildeUrl={person?.bildeUrl}
                  farge={person?.farge}
                  size={gull ? 84 : 66}
                  className={gull ? "ring-2 ring-[var(--gold)]" : ""}
                />
                <span className="font-display text-xl text-fg">{person?.fornavn ?? "?"}</span>
              </motion.div>
              {/* Selve pallen vokser opp */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: hoyde, opacity: 1 }}
                transition={{ delay, type: "spring", stiffness: 130, damping: 17 }}
                className="flex w-full items-start justify-center rounded-t-2xl pt-3"
                style={{
                  background: gull
                    ? "linear-gradient(180deg, color-mix(in srgb, var(--gold) 85%, white), color-mix(in srgb, var(--gold) 70%, black))"
                    : `linear-gradient(180deg, color-mix(in srgb, ${lys} 75%, white), color-mix(in srgb, ${lys} 65%, black))`,
                  boxShadow: `inset 0 2px 0 rgba(255,255,255,0.45), 0 14px 40px -14px ${gull ? "var(--gold)" : lys}`,
                }}
              >
                <span className="font-display text-3xl font-bold text-black/70 tabular-nums">
                  {deltager.poeng}p
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>

      <SlideTekst tekst={o.tekst} delay={2.3} />
    </div>
  );
}

// ─── Poengfesten: minigame-resultater med søyler ─────────────────

function PoengfestSlide({ innslag: o, data }: { innslag: PoengfestInnslag; data: FinaleData }) {
  const maks = Math.max(1, o.resultater[0]?.poeng ?? 1);
  const antall = o.resultater.length;
  const MEDALJER = ["🥇", "🥈", "🥉"];

  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} />
      <h2 className="mt-4 font-display text-4xl text-fg sm:text-6xl">
        <KinetiskTittel tekst={`«${o.ovelseNavn}»`} delay={0.2} steg={0.035} />
      </h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-2 text-xs tracking-widest text-fg-faint uppercase"
      >
        Øvelse {o.ovelseNr} av {data.antallFullfort} · {o.undertekst}
      </motion.p>

      {/* Søylene avsløres fra sisteplass og opp — vinneren til slutt */}
      <div className="mx-auto mt-10 flex h-[260px] max-w-3xl items-end justify-center gap-4">
        {o.resultater.map((r, i) => {
          const person = data.personer[r.userId];
          const lys = lysFarge(person?.farge);
          const hoyde = Math.max(0.14, r.poeng / maks) * 190;
          const delay = 0.6 + (antall - 1 - i) * 0.35;
          return (
            <div key={r.userId} className="flex w-24 flex-col items-center justify-end self-stretch">
              <motion.div
                initial={{ opacity: 0, y: -40, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: delay + 0.18, type: "spring", stiffness: 230, damping: 14 }}
                className="mb-2 flex flex-col items-center gap-1"
              >
                {i < 3 && (
                  <span className="text-lg leading-none" aria-hidden>
                    {MEDALJER[i]}
                  </span>
                )}
                <Avatar
                  navn={person?.navn ?? "?"}
                  bildeUrl={person?.bildeUrl}
                  farge={person?.farge}
                  size={46}
                  className={i === 0 ? "ring-2 ring-[var(--gold)]" : ""}
                />
                {/* Jordskjelv-varianten: hvor mange plasser man flyttet seg i sammendraget */}
                {typeof r.endring === "number" && r.endring !== 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      r.endring > 0
                        ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-accent"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {r.endring > 0 ? `▲${r.endring}` : `▼${-r.endring}`}
                  </span>
                )}
              </motion.div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: hoyde }}
                transition={{ delay, type: "spring", stiffness: 150, damping: 18 }}
                className="flex w-full items-start justify-center rounded-t-xl pt-1.5"
                style={{
                  background: `linear-gradient(180deg, color-mix(in srgb, ${lys} 80%, white), color-mix(in srgb, ${lys} 62%, black))`,
                  boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.4), 0 10px 30px -12px ${lys}`,
                }}
              >
                <span className="text-sm font-bold text-black/70 tabular-nums">{r.poeng}p</span>
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.3 }}
                className="mt-2 w-full truncate text-xs font-medium text-fg-dim"
              >
                {person?.fornavn ?? "?"}
              </motion.span>
            </div>
          );
        })}
      </div>

      <SlideTekst tekst={o.tekst} delay={0.9 + antall * 0.35} />
    </div>
  );
}

// ─── Tetsjiktet: klyngen på poengskalaen ─────────────────────────

function TetsjiktSlide({ innslag: o, data }: { innslag: TetsjiktInnslag; data: FinaleData }) {
  const poeng = o.medlemmer.map((m) => m.poeng);
  const min = Math.min(...poeng);
  const maks = Math.max(...poeng);
  // Litt luft på hver side av klyngen, og et minste spenn så like
  // poengsummer ikke deler på null
  const margin = Math.max(2, Math.round((maks - min) * 0.8));
  const fra = min - margin;
  const til = maks + margin;
  const posisjon = (p: number) => ((p - fra) / (til - fra)) * 100;

  return (
    <div className="text-center">
      <Kicker emoji={o.emoji} tittel={o.tittel} farge="#f87171" />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mx-auto mt-4 max-w-xl text-base text-fg-dim"
      >
        Zoomer vi inn på sammendraget, står det knappe {o.spenn === 0 ? "null" : o.spenn} poeng mellom disse:
      </motion.p>

      <div className="relative mx-auto mt-16 h-44 max-w-2xl">
        {/* Skalaen */}
        <div className="absolute inset-x-0 top-24 h-1 rounded-full bg-white/10" />
        {[fra, til].map((p, i) => (
          <span
            key={i}
            className="absolute top-28 text-xs text-fg-faint tabular-nums"
            style={{ [i === 0 ? "left" : "right"]: 0 }}
          >
            {p}p
          </span>
        ))}

        {/* Avatarene glir inn mot klyngen */}
        {o.medlemmer.map((m, i) => {
          const person = data.personer[m.userId];
          const lys = lysFarge(person?.farge);
          const x = posisjon(m.poeng);
          // Annenhver over/under skalaen så de ikke krasjer
          const over = i % 2 === 0;
          return (
            <motion.div
              key={m.userId}
              className="absolute flex flex-col items-center"
              style={{ left: `${x}%`, top: over ? 0 : 96, translateX: "-50%" }}
              initial={{ opacity: 0, x: i % 2 === 0 ? -140 : 140 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.22, type: "spring", stiffness: 150, damping: 16 }}
            >
              {over ? (
                <>
                  <Avatar navn={person?.navn ?? "?"} bildeUrl={person?.bildeUrl} farge={person?.farge} size={54} />
                  <span className="mt-1 text-xs font-medium text-fg">{person?.fornavn ?? "?"}</span>
                  <span className="h-6 w-px" style={{ backgroundColor: lys }} />
                  <span className="mt-6 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums" style={{ color: lys }}>
                    {m.poeng}p
                  </span>
                </>
              ) : (
                <>
                  <span className="mb-6 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums" style={{ color: lys }}>
                    {m.poeng}p
                  </span>
                  <span className="h-6 w-px" style={{ backgroundColor: lys }} />
                  <Avatar navn={person?.navn ?? "?"} bildeUrl={person?.bildeUrl} farge={person?.farge} size={54} />
                  <span className="mt-1 text-xs font-medium text-fg">{person?.fornavn ?? "?"}</span>
                </>
              )}
            </motion.div>
          );
        })}

        {/* Spenn-merket smeller inn til slutt */}
        <motion.span
          initial={{ opacity: 0, scale: 0, rotate: 8 }}
          animate={{ opacity: 1, scale: 1, rotate: -4 }}
          transition={{ delay: 0.7 + o.medlemmer.length * 0.22, type: "spring", stiffness: 260, damping: 14 }}
          className="absolute -right-4 top-16 rounded-2xl border-2 border-[#f87171] bg-bg px-4 py-2 font-display text-xl font-bold text-[#f87171] shadow-[0_0_36px_-8px_#f87171]"
        >
          {o.spenn === 0 ? "dødt løp!" : `${o.spenn}p spenn`}
        </motion.span>
      </div>

      <SlideTekst tekst={o.tekst} delay={1.3 + o.medlemmer.length * 0.22} />
    </div>
  );
}

// ─── Pris ────────────────────────────────────────────────────────

const PRIS_AVSLORING_MS = 1700;

function PrisSlide({ pris, data, lyd }: { pris: Pris; data: FinaleData; lyd: ShowLyd }) {
  const person = data.personer[pris.userId];
  const [avslort, setAvslort] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setAvslort(true);
      lyd.ding();
    }, PRIS_AVSLORING_MS);
    return () => clearTimeout(t);
  }, [lyd]);

  return (
    <div className="text-center">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm tracking-[0.4em] text-[var(--gold)] uppercase"
      >
        Prisutdelingen
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 14 }}
        className="mt-5 text-6xl"
        aria-hidden
      >
        {pris.emoji}
      </motion.div>
      <h2 className="mt-3 font-display text-5xl text-fg sm:text-6xl">
        <KinetiskTittel tekst={pris.navn} delay={0.3} steg={0.05} />
      </h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mx-auto mt-3 max-w-xl text-base text-fg-dim"
      >
        {pris.begrunnelse}
      </motion.p>

      <div className="mt-10 flex min-h-[220px] flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!avslort ? (
            <motion.div
              key="hemmelig"
              exit={{ opacity: 0, scale: 0.6 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-line-strong font-display text-5xl text-fg-dim">
                <span className="animate-vekt-pust">?</span>
              </span>
              <span className="text-xs tracking-widest text-fg-faint uppercase">
                Og prisen går til …
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="avslort"
              initial={{ opacity: 0, scale: 0.4, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 190, damping: 14 }}
              className="flex flex-col items-center gap-4"
            >
              <span
                className="inline-block rounded-full p-1.5"
                style={{
                  background: "linear-gradient(135deg, var(--gold), transparent 70%)",
                }}
              >
                <Avatar
                  navn={person?.navn ?? "?"}
                  bildeUrl={person?.bildeUrl}
                  farge={person?.farge}
                  size={110}
                />
              </span>
              <p className="font-display text-4xl text-fg sm:text-5xl">
                {person?.navn ?? "?"}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-4 py-1.5 text-sm text-[var(--gold)]">
                <Sparkles size={14} />
                {pris.verdi}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Hederlige omtaler ───────────────────────────────────────────

function HederligSlide({ data }: { data: FinaleData }) {
  return (
    <div className="text-center">
      <Kicker emoji="🎗️" tittel="Hederlige omtaler" farge="var(--gold)" />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mx-auto mt-4 max-w-xl text-base text-fg-dim"
      >
        Lekene hadde ikke vært lekene uten disse:
      </motion.p>
      <div className="mx-auto mt-9 flex max-w-3xl flex-wrap items-stretch justify-center gap-4">
        {data.hederlige.map((h, i) => {
          const person = data.personer[h.userId];
          return (
            <motion.div
              key={h.userId}
              initial={{ opacity: 0, y: 24, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.2, type: "spring", stiffness: 220, damping: 18 }}
              className="surface flex w-52 flex-col items-center gap-3 rounded-3xl px-5 py-6"
            >
              <Avatar
                navn={person?.navn ?? "?"}
                bildeUrl={person?.bildeUrl}
                farge={person?.farge}
                size={72}
              />
              <p className="font-display text-xl text-fg">{person?.fornavn ?? "?"}</p>
              <span className="rounded-full border border-line bg-white/[0.04] px-3 py-1 text-xs text-fg-dim">
                {h.stat}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vendepunktet ────────────────────────────────────────────────

function VendepunktSlide({ vendepunkt: v, data }: { vendepunkt: Vendepunkt; data: FinaleData }) {
  return (
    <div className="text-center">
      <Kicker emoji={v.emoji} tittel={v.tittel} farge="var(--gold)" />
      <PersonHeader userId={v.userId} data={data} ring="ring-2 ring-[var(--gold)]" />
      <PosisjonsGraf
        data={data}
        highlightId={v.userId}
        strek="var(--gold)"
        markerNr={v.ovelseNr}
      />
      <SlideTekst tekst={v.tekst} delay={2.4} />
    </div>
  );
}

// ─── Tidslinje ───────────────────────────────────────────────────

const TIDSLINJE_INTERVALL_MS = 2400;
const TIDSLINJE_ANTALL_RADER = 7;

function TidslinjeSlide({
  data,
  kontrollRef,
  lyd,
}: {
  data: FinaleData;
  kontrollRef: React.MutableRefObject<{ hoppTilSlutt: () => boolean } | null>;
  lyd: ShowLyd;
}) {
  const { tidslinje, personer } = data;
  const sisteSteg = tidslinje.length - 1;
  const [steg, setSteg] = useState(0);

  useEffect(() => {
    if (steg >= sisteSteg) return;
    const t = setTimeout(() => setSteg((s) => s + 1), TIDSLINJE_INTERVALL_MS);
    return () => clearTimeout(t);
  }, [steg, sisteSteg]);

  // Racet tikker — og lederbytter får sin egen liten fanfareblip
  useEffect(() => {
    if (steg === 0) return;
    lyd.blip(tidslinje[steg].lederbytte);
  }, [steg, tidslinje, lyd]);

  useEffect(() => {
    kontrollRef.current = {
      hoppTilSlutt: () => {
        let konsumert = false;
        setSteg((s) => {
          if (s < sisteSteg) konsumert = true;
          return sisteSteg;
        });
        return konsumert;
      },
    };
    return () => {
      kontrollRef.current = null;
    };
  }, [kontrollRef, sisteSteg]);

  const aktiv = tidslinje[steg];
  const rader = aktiv.stilling.slice(0, TIDSLINJE_ANTALL_RADER);
  const maksPoeng = Math.max(1, rader[0]?.poeng ?? 1);

  return (
    <div>
      <div className="text-center">
        <p className="text-xs tracking-[0.35em] text-accent-2 uppercase">
          Slik gikk lekene
        </p>
        <div className="mt-2 flex min-h-[3.5rem] items-center justify-center gap-3">
          <AnimatePresence mode="wait">
            <motion.h2
              key={aktiv.nr}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="font-display text-2xl text-fg sm:text-4xl"
            >
              <span className="text-fg-faint tabular-nums">
                {aktiv.nr}/{tidslinje.length}
              </span>{" "}
              {aktiv.ovelseNavn}
            </motion.h2>
          </AnimatePresence>
          {aktiv.lederbytte && steg > 0 && (
            <motion.span
              key={`bytte-${aktiv.nr}`}
              initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              className="rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-black"
            >
              Ny leder!
            </motion.span>
          )}
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-2.5">
        {rader.map((rad, i) => {
          const person = personer[rad.userId];
          const farge = person?.farge ?? "var(--accent-2)";
          const pct = Math.max(6, (rad.poeng / maksPoeng) * 100);
          return (
            <motion.div
              key={rad.userId}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex items-center gap-3"
            >
              <span className="w-6 text-right text-sm text-fg-faint tabular-nums">
                {i + 1}.
              </span>
              <Avatar
                navn={person?.navn ?? "?"}
                bildeUrl={person?.bildeUrl}
                farge={person?.farge}
                size={34}
              />
              <span className="w-24 truncate text-sm font-medium text-fg sm:w-32">
                {person?.fornavn ?? "?"}
              </span>
              <div className="relative h-8 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="flex h-full items-center justify-end rounded-full pr-3"
                  style={{ backgroundColor: farge }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 22 }}
                >
                  <span className="text-xs font-semibold text-white tabular-nums">
                    {rad.poeng}p
                  </span>
                </motion.div>
              </div>
              <span className="w-6 text-lg">
                {i === 0 ? (
                  <Crown size={20} className="text-[var(--gold)]" />
                ) : null}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-1.5">
        {tidslinje.map((t, i) => (
          <button
            key={t.nr}
            onClick={() => setSteg(i)}
            aria-label={`Hopp til ${t.ovelseNavn}`}
            className={
              i <= steg
                ? "h-2 w-2 rounded-full bg-accent-2 transition-all"
                : "h-2 w-2 rounded-full bg-white/15 transition-all"
            }
          />
        ))}
      </div>

      <AnimatePresence>
        {steg === sisteSteg && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center text-sm text-fg-dim italic"
          >
            … og dermed var alt klart for den store kåringen 🥁
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Trommevirvel og vinner ──────────────────────────────────────

function TrommevirvelSlide({ data, lyd }: { data: FinaleData; lyd: ShowLyd }) {
  // Ekte (syntetisert) trommevirvel så lenge sliden står
  useEffect(() => {
    lyd.startTrommevirvel();
    return () => lyd.stoppTrommevirvel();
  }, [lyd]);

  return (
    <div className="text-center">
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.4 }}
        className="text-7xl"
        aria-hidden
      >
        🥁
      </motion.div>
      <h2 className="mt-8 font-display text-4xl text-fg sm:text-6xl">
        Og vinneren av
        <br />
        <span className="text-gradient font-bold">{data.sesongNavn}</span>
        <br />
        <span className="animate-vekt-pust inline-block">er …</span>
      </h2>
      <div className="mt-10 flex items-center justify-center gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-pulse-dot h-3 w-3 rounded-full bg-accent-2"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>
    </div>
  );
}

const KONFETTI_FARGER = [
  "var(--gold)",
  "var(--accent)",
  "var(--accent-2)",
  "var(--accent-3)",
  "#f472b6",
  "#f5f5f7",
];

function Konfetti() {
  // Deterministisk "tilfeldighet" så serveren og klienten er enige
  const biter = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          left: r(1) * 100,
          size: 7 + r(2) * 7,
          farge: KONFETTI_FARGER[i % KONFETTI_FARGER.length],
          varighet: 3.6 + r(3) * 2.8,
          forsinkelse: r(4) * 3.2,
          drift: (r(5) - 0.5) * 30,
        };
      }),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {biter.map((b, i) => (
        <span
          key={i}
          className="konfetti-bit"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size * 1.5,
            backgroundColor: b.farge,
            animationDuration: `${b.varighet}s`,
            animationDelay: `${b.forsinkelse}s`,
            ["--kx" as string]: `${b.drift}vw`,
          }}
        />
      ))}
    </div>
  );
}

function VinnerSlide({
  deltaker: d,
  data,
  lyd,
}: {
  deltaker: FinaleDeltaker;
  data: FinaleData;
  lyd: ShowLyd;
}) {
  useEffect(() => {
    lyd.fanfare();
  }, [lyd]);

  return (
    <div className="relative text-center">
      <Konfetti />

      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
        className="inline-block"
      >
        <Crown size={56} className="animate-float text-[var(--gold)]" />
      </motion.div>

      <div className="relative inline-block">
        {/* Gullglød bak vinneren */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--gold) 22%, transparent), transparent 65%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 160, damping: 14 }}
          className="relative mt-4 inline-block rounded-full p-2"
          style={{
            background:
              "conic-gradient(from 0deg, var(--gold), var(--accent-2), var(--accent-3), var(--gold))",
          }}
        >
          <Avatar navn={d.navn} bildeUrl={d.bildeUrl} farge={d.farge} size={190} />
        </motion.div>
      </div>

      <h2 className="mt-6 font-display text-6xl sm:text-8xl">
        <KinetiskTittel tekst={d.navn} gradient delay={0.8} steg={0.08} />
      </h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 font-display text-2xl text-fg sm:text-3xl"
      >
        🏆 Vinner av {data.sesongNavn} 🏆
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.25 }}
        className="mt-3 text-lg text-fg-dim"
      >
        {d.totalPoeng} poeng · {d.seire}{" "}
        {d.seire === 1 ? "seier" : "seire"} · {d.antallOvelser} leker
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mx-auto mt-5 max-w-xl text-lg text-fg-dim italic"
      >
        «{d.kommentar}»
      </motion.p>

      {(() => {
        const ifjorVinner = fjoraretStilling()[0];
        const forsvarte =
          ifjorVinner.navn.toLowerCase() === d.fornavn.toLowerCase();
        return (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.75 }}
            className="mx-auto mt-4 max-w-xl text-sm text-fg-faint"
          >
            {forsvarte
              ? `👑 Forsvarte tronen fra ${FJORARET_AAR} — to på rad!`
              : `Ny mester på tronen — ${ifjorVinner.navn} vant i ${FJORARET_AAR}.`}
          </motion.p>
        );
      })()}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-8 text-xs tracking-widest text-fg-faint uppercase"
      >
        Trykk Neste for å utforske tallene 🎊
      </motion.p>
    </div>
  );
}

// ─── Tallenes tale: interaktiv graf og tabell ────────────────────

type TabellKolonne = {
  key: string;
  label: string;
  verdi: (d: FinaleDeltaker) => number;
  format: (d: FinaleDeltaker) => string;
};

const TABELL_KOLONNER: TabellKolonne[] = [
  { key: "plass", label: "#", verdi: (d) => -d.plass, format: (d) => `${d.plass}.` },
  { key: "poeng", label: "Poeng", verdi: (d) => d.totalPoeng, format: (d) => String(d.totalPoeng) },
  { key: "seire", label: "Seire", verdi: (d) => d.seire, format: (d) => String(d.seire) },
  { key: "pall", label: "Pall", verdi: (d) => d.pall, format: (d) => String(d.pall) },
  { key: "rekord", label: "Rekord", verdi: (d) => d.rekord, format: (d) => `${d.rekord}p` },
  { key: "snitt", label: "Snitt", verdi: (d) => d.snitt, format: (d) => d.snitt.toFixed(1) },
  { key: "ovelser", label: "Øvelser", verdi: (d) => d.antallOvelser, format: (d) => String(d.antallOvelser) },
];

function TalleneSlide({ data }: { data: FinaleData }) {
  const harGraf = data.tidslinje.length >= 2;
  const [visning, setVisning] = useState<"graf" | "tabell">(harGraf ? "graf" : "tabell");
  const [valgte, setValgte] = useState<Set<string>>(
    () => new Set(data.deltakere.slice(0, 3).map((d) => d.userId)),
  );
  const [sortKey, setSortKey] = useState("plass");
  const [sortStigende, setSortStigende] = useState(false);

  const toggle = (userId: string) =>
    setValgte((prev) => {
      const neste = new Set(prev);
      if (neste.has(userId)) neste.delete(userId);
      else neste.add(userId);
      return neste;
    });

  const sorterte = useMemo(() => {
    const kol = TABELL_KOLONNER.find((k) => k.key === sortKey) ?? TABELL_KOLONNER[0];
    return [...data.deltakere].sort((a, b) => {
      const diff = kol.verdi(b) - kol.verdi(a);
      return sortStigende ? -diff : diff;
    });
  }, [data.deltakere, sortKey, sortStigende]);

  const sorterPaa = (key: string) => {
    if (key === sortKey) setSortStigende((s) => !s);
    else {
      setSortKey(key);
      setSortStigende(false);
    }
  };

  // Kumulative poengserier til grafen
  const W = 880;
  const H = 380;
  const padL = 48;
  const padR = 110;
  const padT = 18;
  const padB = 34;
  const steg = data.tidslinje.length;
  const serier = useMemo(
    () =>
      data.deltakere.map((d) => ({
        deltaker: d,
        verdier: data.tidslinje.map(
          (t) => t.stilling.find((s) => s.userId === d.userId)?.poeng ?? 0,
        ),
      })),
    [data],
  );
  const maksPoeng = Math.max(1, ...serier.flatMap((s) => s.verdier));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, steg - 1);
  const y = (v: number) => H - padB - (v / maksPoeng) * (H - padT - padB);

  return (
    <div className="text-center">
      <Kicker emoji="🤓" tittel="Tallenes tale" />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mx-auto mt-3 max-w-xl text-base text-fg-dim"
      >
        Utforsk hele sesongen — klikk deg rundt i grafen og tabellen.
      </motion.p>

      {harGraf && (
        <div className="mt-5 inline-flex rounded-full border border-line bg-bg-elev/70 p-1">
          {(
            [
              { id: "graf" as const, label: "Poenggraf", Ikon: LineChart },
              { id: "tabell" as const, label: "Tabell", Ikon: Table2 },
            ]
          ).map(({ id, label, Ikon }) => (
            <button
              key={id}
              onClick={() => setVisning(id)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                visning === id ? "bg-white/10 text-fg" : "text-fg-dim hover:text-fg"
              }`}
            >
              <Ikon size={15} />
              {label}
            </button>
          ))}
        </div>
      )}

      {visning === "graf" && harGraf ? (
        <div className="mt-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-4xl" role="img" aria-label="Kumulative poeng gjennom lekene">
            <defs>
              {serier
                .filter((s) => valgte.has(s.deltaker.userId))
                .map((s) => {
                  const lys = lysFarge(s.deltaker.farge);
                  const id = s.deltaker.userId;
                  return (
                    <g key={id}>
                      <linearGradient id={`omr-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lys} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={lys} stopOpacity="0" />
                      </linearGradient>
                      <filter id={`lgl-${id}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor={lys} floodOpacity="0.55" />
                      </filter>
                    </g>
                  );
                })}
            </defs>
            {/* Prikkede hjelpelinjer */}
            {[0.25, 0.5, 0.75, 1].map((andel) => {
              const v = Math.round(maksPoeng * andel);
              return (
                <g key={andel}>
                  <line
                    x1={padL}
                    x2={W - padR}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="1 7"
                    strokeLinecap="round"
                  />
                  <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--fg-faint)">
                    {v}
                  </text>
                </g>
              );
            })}
            {data.tidslinje.map((t, i) => (
              <text key={t.nr} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--fg-faint)">
                {t.nr}
              </text>
            ))}

            {/* Umarkerte serier bakerst, valgte serier foran */}
            {(() => {
              // Skyv sluttetikettene fra hverandre når poengene er jevne
              const aktive = serier
                .filter((s) => valgte.has(s.deltaker.userId))
                .sort((a, b) => b.verdier[steg - 1] - a.verdier[steg - 1]);
              const labelY = new Map<string, number>();
              let forrigeY = -Infinity;
              for (const s of aktive) {
                const oensket = y(s.verdier[steg - 1]) + 4;
                const plassert = Math.max(oensket, forrigeY + 16);
                labelY.set(s.deltaker.userId, plassert);
                forrigeY = plassert;
              }
              return [
                ...serier.filter((s) => !valgte.has(s.deltaker.userId)),
                ...aktive,
              ].map((s) => {
                const aktiv = valgte.has(s.deltaker.userId);
                const lys = lysFarge(s.deltaker.farge);
                const id = s.deltaker.userId;
                const d = s.verdier
                  .map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`)
                  .join(" ");
                const omraade = `${d} L${x(steg - 1)},${H - padB} L${x(0)},${H - padB} Z`;
                return (
                  <g key={s.deltaker.userId}>
                    {aktiv && <path d={omraade} fill={`url(#omr-${id})`} />}
                    <path
                      d={d}
                      fill="none"
                      stroke={lys}
                      strokeOpacity={aktiv ? 1 : 0.14}
                      strokeWidth={aktiv ? 3.5 : 1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={aktiv ? `url(#lgl-${id})` : undefined}
                    />
                    {aktiv && (
                      <>
                        <circle
                          cx={x(steg - 1)}
                          cy={y(s.verdier[steg - 1])}
                          r={5}
                          fill={lys}
                          stroke="var(--bg)"
                          strokeWidth={2}
                        />
                        <text
                          x={x(steg - 1) + 12}
                          y={labelY.get(s.deltaker.userId)}
                          fontSize={13}
                          fontWeight={600}
                          fill={lys}
                        >
                          {s.deltaker.fornavn} · {s.verdier[steg - 1]}p
                        </text>
                      </>
                    )}
                  </g>
                );
              });
            })()}
          </svg>

          {/* Deltakervelger */}
          <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {data.deltakere.map((d) => {
              const aktiv = valgte.has(d.userId);
              const lys = lysFarge(d.farge);
              return (
                <button
                  key={d.userId}
                  onClick={() => toggle(d.userId)}
                  aria-pressed={aktiv}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-all ${
                    aktiv ? "" : "border-line text-fg-faint opacity-60 hover:opacity-100"
                  }`}
                  style={
                    aktiv
                      ? {
                          color: lys,
                          borderColor: `color-mix(in srgb, ${lys} 55%, transparent)`,
                          backgroundColor: `color-mix(in srgb, ${lys} 12%, transparent)`,
                          boxShadow: `0 0 20px -8px ${lys}`,
                        }
                      : undefined
                  }
                >
                  <Avatar navn={d.navn} bildeUrl={d.bildeUrl} farge={d.farge} size={22} />
                  {d.fornavn}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="surface mx-auto mt-5 max-w-4xl overflow-x-auto rounded-3xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-fg-dim">
                {TABELL_KOLONNER.slice(0, 1).map((k) => (
                  <th key={k.key} className="px-4 py-3 text-left">
                    <button onClick={() => sorterPaa(k.key)} className="hover:text-fg">
                      {k.label} {sortKey === k.key ? (sortStigende ? "▲" : "▼") : ""}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium">Deltaker</th>
                {TABELL_KOLONNER.slice(1).map((k) => (
                  <th key={k.key} className="px-4 py-3 text-right">
                    <button onClick={() => sorterPaa(k.key)} className="hover:text-fg">
                      {k.label} {sortKey === k.key ? (sortStigende ? "▲" : "▼") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorterte.map((d) => (
                <tr
                  key={d.userId}
                  className={`border-b border-line/50 last:border-0 ${
                    d.plass === 1 ? "bg-[color-mix(in_srgb,var(--gold)_8%,transparent)]" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-left text-fg-dim tabular-nums">
                    {d.plass === 1 ? "🏆" : `${d.plass}.`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5 text-fg">
                      <Avatar navn={d.navn} bildeUrl={d.bildeUrl} farge={d.farge} size={26} />
                      {d.navn}
                    </span>
                  </td>
                  {TABELL_KOLONNER.slice(1).map((k) => (
                    <td key={k.key} className="px-4 py-2.5 text-right text-fg tabular-nums">
                      {k.format(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
