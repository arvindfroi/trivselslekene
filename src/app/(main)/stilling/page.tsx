import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import {
  hentAlleSesongData,
  hentKvalitetsledere,
  hentSpillerdetaljer,
  hentStilling,
  hentUtmerkelser,
} from "@/lib/stilling";
import { kvalitetIkon, kvalitetTekst } from "@/lib/ovelseLabels";
import { antallFyllCeller, BENTO_GRID, bentoSpenn, erStor, seededShuffle } from "@/lib/bento";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import StillingListe from "@/components/StillingListe";
import StatFlis from "@/components/StatFlis";
import {
  CloudRain,
  Crown,
  Flame,
  HeartCrack,
  Medal,
  Shapes,
  Swords,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const UTMERKELSER: {
  key: string;
  tittel: string;
  tekst: string;
  forklaring: string;
  Ikon: LucideIcon;
}[] = [
  {
    key: "seire",
    tittel: "Vinnermaskin",
    tekst: "Flest førsteplasser",
    forklaring: "Rangert etter antall øvelser der du endte på 1. plass.",
    Ikon: Trophy,
  },
  {
    key: "pall",
    tittel: "Pallhabitué",
    tekst: "Flest pallplasser",
    forklaring: "Rangert etter antall øvelser der du endte blant de tre beste.",
    Ikon: Medal,
  },
  {
    key: "kamper",
    tittel: "Ironman",
    tekst: "Flest kamper spilt",
    forklaring: "Rangert etter antall øvelser du har deltatt i totalt denne sesongen.",
    Ikon: Swords,
  },
  {
    key: "snitt",
    tittel: "Snittkongen",
    tekst: "Best poengsnitt",
    forklaring: "Rangert etter gjennomsnittlig poengsum per øvelse. Krever minst to spilte øvelser.",
    Ikon: TrendingUp,
  },
  {
    key: "rekord",
    tittel: "Rekordholder",
    tekst: "Høyeste enkeltresultat",
    forklaring: "Rangert etter høyeste poengsum oppnådd i en enkelt øvelse.",
    Ikon: Flame,
  },
  {
    key: "allsidig",
    tittel: "Multitalentet",
    tekst: "Flest ulike egenskaper",
    forklaring: "Rangert etter antall ulike egenskaper du har scoret poeng i.",
    Ikon: Shapes,
  },
  {
    key: "vert",
    tittel: "Sjefsarrangør",
    tekst: "Arrangert flest leker",
    forklaring: "Rangert etter antall øvelser du har arrangert som vert.",
    Ikon: Crown,
  },
  {
    key: "uheldig",
    tittel: "Uflaks-magneten",
    tekst: "Flest sisteplasser",
    forklaring: "Rangert etter antall øvelser der du endte sist.",
    Ikon: CloudRain,
  },
  {
    key: "trost",
    tittel: "Trøstepremien",
    tekst: "Lavest poengsnitt",
    forklaring: "Rangert etter lavest gjennomsnittlig poengsum — en trøst for jevn innsats uansett resultat. Krever minst to spilte øvelser.",
    Ikon: HeartCrack,
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Statistikk" };
}

export default async function StillingSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();
  const [sesongData, antallOvelser, antallFullfort] = await Promise.all([
    hentAlleSesongData(sesong.id),
    prisma.ovelse.count({ where: { sesongId: sesong.id } }),
    prisma.ovelse.count({
      where: { sesongId: sesong.id, status: "FULLFORT" },
    }),
  ]);
  const stilling = hentStilling(sesongData);
  const detaljer = hentSpillerdetaljer(sesongData);
  const kvalitetsledere = hentKvalitetsledere(sesongData);
  const utmerkelser = hentUtmerkelser(sesongData);
  const toppPoeng = Math.max(1, ...stilling.map((s) => s.totalPoeng));
  const leder = stilling.find((s) => s.totalPoeng > 0);

  // Slår sammen "beste innen hver egenskap" og "rekorder og utmerkelser" til
  // én bento-mosaikk, blandet (ikke gruppert) i en stabil, sesong-seedet rekkefølge.
  const egenskapFliser = kvalitetsledere.map(({ kvalitet, leder: best, alle }) => ({
    key: `kval-${kvalitet}`,
    tittel: kvalitetTekst[kvalitet],
    tekst: undefined,
    forklaring: `Rangert etter summen av poeng scoret i øvelser som tester ${kvalitetTekst[kvalitet].toLowerCase()}.`,
    Ikon: kvalitetIkon[kvalitet],
    leder: best ? { navn: best.navn, bildeUrl: best.bildeUrl, verdi: String(best.poeng) } : null,
    alle: alle.map((a) => ({ navn: a.navn, bildeUrl: a.bildeUrl, verdi: String(a.poeng) })),
  }));
  const utmerkelseFliser = UTMERKELSER.map((u) => {
    const l = utmerkelser.find((x) => x.key === u.key);
    return {
      key: `utm-${u.key}`,
      tittel: u.tittel,
      tekst: u.tekst,
      forklaring: u.forklaring,
      Ikon: u.Ikon,
      leder: l?.leder ? { navn: l.leder.navn, bildeUrl: l.leder.bildeUrl, verdi: l.leder.verdi } : null,
      alle: l?.alle.map((a) => ({ navn: a.navn, bildeUrl: a.bildeUrl, verdi: a.verdi })) ?? [],
    };
  });
  const bentoFliser = seededShuffle([...egenskapFliser, ...utmerkelseFliser], sesong.id);
  const fyllCeller = antallFyllCeller(bentoFliser.map((_, i) => bentoSpenn(i)));

  return (
    <>
        <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
          {sesong.navn}
        </p>
        <h1 className="mt-1 font-display text-4xl text-fg">Statistikk</h1>
        <p className="mt-2 text-sm text-fg-dim">
          Sammenlagt stilling, egenskaper og utmerkelser for lekene.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="Deltakere" verdi={String(stilling.length)} />
          <StatCard label="Øvelser" verdi={`${antallFullfort}/${antallOvelser}`} />
          <StatCard label="Leder" verdi={leder ? leder.navn.split(" ")[0] : "–"} />
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">Sammenlagt</h2>
          <Card padding="p-0" className="overflow-hidden">
            {stilling.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-fg-dim">Ingen resultater er registrert ennå.</p>
            ) : (
              <StillingListe rader={stilling} detaljer={detaljer} meId={session.user.id} toppPoeng={toppPoeng} />
            )}
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">Rekorder og utmerkelser</h2>
          <div className={BENTO_GRID}>
            {bentoFliser.map((f, i) => {
              const s = erStor(i);
              return (
                <StatFlis
                  key={f.key}
                  className={bentoSpenn(i)}
                  stor={s}
                  ikonKort={<f.Ikon size={s ? 26 : 18} />}
                  ikonModal={<f.Ikon size={20} />}
                  tittel={f.tittel}
                  tekst={f.tekst}
                  forklaring={f.forklaring}
                  leder={f.leder}
                  alle={f.alle}
                />
              );
            })}
            {Array.from({ length: fyllCeller }).map((_, i) => (
              <div key={`fyll-${i}`} aria-hidden="true" className="hidden sm:block" />
            ))}
          </div>
        </section>
    </>
  );
}
