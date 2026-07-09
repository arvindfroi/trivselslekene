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
import { BENTO_GRID, bentoSpenn, erStor } from "@/lib/bento";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import StatFlis from "@/components/StatFlis";
import StillingListe from "@/components/StillingListe";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";
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
  Ikon: LucideIcon;
}[] = [
  { key: "seire", tittel: "Vinnermaskin", tekst: "Flest førsteplasser", Ikon: Trophy },
  { key: "pall", tittel: "Pallhabitué", tekst: "Flest pallplasser", Ikon: Medal },
  { key: "kamper", tittel: "Ironman", tekst: "Flest kamper spilt", Ikon: Swords },
  { key: "snitt", tittel: "Snittkongen", tekst: "Best poengsnitt", Ikon: TrendingUp },
  { key: "rekord", tittel: "Rekordholder", tekst: "Høyeste enkeltresultat", Ikon: Flame },
  { key: "allsidig", tittel: "Multitalentet", tekst: "Flest ulike egenskaper", Ikon: Shapes },
  { key: "vert", tittel: "Sjefsarrangør", tekst: "Arrangert flest leker", Ikon: Crown },
  { key: "uheldig", tittel: "Uflaks-magneten", tekst: "Flest sisteplasser", Ikon: CloudRain },
  { key: "trost", tittel: "Trøstepremien", tekst: "Lavest poengsnitt", Ikon: HeartCrack },
];

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Statistikk" };
}

function FeilVisning({ melding }: { melding: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
      <h1 className="font-display text-4xl text-fg">Statistikk</h1>
      <div className="surface mt-6 rounded-2xl p-6">
        <p className="text-sm font-medium text-red-400">Debug-feil:</p>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-fg-dim">{melding}</pre>
      </div>
    </div>
  );
}

async function lastStatistikk(sesongId: string) {
  const steps: string[] = [];

  try {
    steps.push("henter sesongdata...");
    const [sesongData, antallOvelser, antallFullfort] = await Promise.all([
      hentAlleSesongData(sesongId),
      prisma.ovelse.count({ where: { sesongId } }),
      prisma.ovelse.count({
        where: { sesongId, status: "FULLFORT" },
      }),
    ]);
    steps.push(`sesongdata OK: ${sesongData.brukere.length} brukere`);

    steps.push("hentStilling...");
    const stilling = hentStilling(sesongData);
    steps.push(`stilling OK: ${stilling.length} rader`);

    steps.push("hentSpillerdetaljer...");
    const detaljer = hentSpillerdetaljer(sesongData);
    steps.push(`detaljer OK: ${Object.keys(detaljer).length}`);

    steps.push("hentKvalitetsledere...");
    const kvalitetsledere = hentKvalitetsledere(sesongData);
    steps.push(`kvalitetsledere OK: ${kvalitetsledere.length}`);

    steps.push("hentUtmerkelser...");
    const utmerkelser = hentUtmerkelser(sesongData);
    steps.push(`utmerkelser OK: ${utmerkelser.length}`);

    const toppPoeng = Math.max(1, ...stilling.map((s) => s.totalPoeng));
    const leder = stilling.find((s) => s.totalPoeng > 0);

    return {
      stilling,
      detaljer,
      kvalitetsledere,
      utmerkelser,
      antallOvelser,
      antallFullfort,
      toppPoeng,
      leder,
    };
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
    throw new Error(`Statistikk-feil:\nSiste steg: ${steps[steps.length - 1] ?? "ukjent"}\n${message}`);
  }
}

export default async function StillingSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  let feil: string | null = null;
  let stilling, detaljer, kvalitetsledere, utmerkelser;
  let antallOvelser = 0;
  let antallFullfort = 0;
  let toppPoeng = 1;
  let leder;

  try {
    const data = await lastStatistikk(sesong.id);
    stilling = data.stilling;
    detaljer = data.detaljer;
    kvalitetsledere = data.kvalitetsledere;
    utmerkelser = data.utmerkelser;
    antallOvelser = data.antallOvelser;
    antallFullfort = data.antallFullfort;
    toppPoeng = data.toppPoeng;
    leder = data.leder;
  } catch (err) {
    feil = err instanceof Error ? err.message : String(err);
  }

  if (feil) {
    return (
      <>
        <DeltakerSlideshow />
        <FeilVisning melding={feil} />
      </>
    );
  }

  return (
    <>
      <DeltakerSlideshow />
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-28 pb-12">
        <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
          {sesong.navn}
        </p>
        <h1 className="mt-1 font-display text-4xl text-fg">Statistikk</h1>
        <p className="mt-2 text-sm text-fg-dim">
          Sammenlagt stilling, egenskaper og utmerkelser for lekene.
        </p>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Deltakere" verdi={String(stilling!.length)} />
        <StatCard
          label="Øvelser"
          verdi={`${antallFullfort}/${antallOvelser}`}
        />
        <StatCard label="Leder" verdi={leder ? leder.navn.split(" ")[0] : "–"} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Sammenlagt
        </h2>
        <Card padding="p-0" className="overflow-hidden">
          {stilling!.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-fg-dim">
              Ingen resultater er registrert ennå.
            </p>
          ) : (
            <StillingListe
              rader={stilling!}
              detaljer={detaljer!}
              meId={session.user.id}
              toppPoeng={toppPoeng}
            />
          )}
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Beste innen hver egenskap
        </h2>
        <div className={BENTO_GRID}>
          {kvalitetsledere!.map(({ kvalitet, leder: best, topp3 }, i) => (
            <StatFlis
              key={kvalitet}
              className={bentoSpenn(i)}
              stor={erStor(i)}
              Ikon={kvalitetIkon[kvalitet]}
              tittel={kvalitetTekst[kvalitet]}
              leder={
                best
                  ? {
                      navn: best.navn,
                      bildeUrl: best.bildeUrl,
                      verdi: String(best.poeng),
                    }
                  : null
              }
              topp3={topp3.map((t) => ({
                navn: t.navn,
                bildeUrl: t.bildeUrl,
                verdi: String(t.poeng),
              }))}
            />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Rekorder og utmerkelser
        </h2>
        <div className={BENTO_GRID}>
          {UTMERKELSER.map((u, i) => {
            const l = utmerkelser!.find((x) => x.key === u.key);
            return (
              <StatFlis
                key={u.key}
                className={bentoSpenn(i)}
                stor={erStor(i)}
                Ikon={u.Ikon}
                tittel={u.tittel}
                tekst={u.tekst}
                leder={
                  l?.leder
                    ? { navn: l.leder.navn, bildeUrl: l.leder.bildeUrl, verdi: l.leder.verdi }
                    : null
                }
                topp3={l?.topp3.map((t) => ({
                  navn: t.navn,
                  bildeUrl: t.bildeUrl,
                  verdi: t.verdi,
                }))}
              />
            );
          })}
        </div>
      </section>
    </div>
    </>
  );
}
