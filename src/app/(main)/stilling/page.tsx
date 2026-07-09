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
import StillingListe from "@/components/StillingListe";
import Avatar from "@/components/Avatar";
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
import { cn } from "@/lib/utils";

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
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">Beste innen hver egenskap</h2>
          <div className={BENTO_GRID}>
            {kvalitetsledere.map(({ kvalitet, leder: best }, i) => {
              const Ikon = kvalitetIkon[kvalitet];
              const s = erStor(i);
              return (
                <div key={kvalitet} className={cn("surface flex flex-col rounded-2xl p-4", bentoSpenn(i))}>
                  <span className={cn("bg-gradient-accent flex shrink-0 items-center justify-center rounded-xl text-white", s ? "h-14 w-14" : "h-10 w-10")}>
                    <Ikon size={s ? 26 : 18} />
                  </span>
                  <p className={cn("mt-3 font-medium text-fg", s ? "text-lg" : "text-sm")}>{kvalitetTekst[kvalitet]}</p>
                  <div className="mt-auto pt-3">
                    {best ? (
                      <div className="flex items-center gap-2">
                        <Avatar navn={best.navn} bildeUrl={best.bildeUrl} size={s ? 28 : 22} />
                        <span className="truncate text-sm font-medium text-fg">{best.navn}</span>
                        <span className="ml-auto shrink-0 text-xs text-fg-dim tabular-nums">{best.poeng}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-fg-faint">Ingen ennå</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">Rekorder og utmerkelser</h2>
          <div className={BENTO_GRID}>
            {UTMERKELSER.map((u, i) => {
              const l = utmerkelser.find((x) => x.key === u.key);
              const s = erStor(i);
              return (
                <div key={u.key} className={cn("surface flex flex-col rounded-2xl p-4", bentoSpenn(i))}>
                  <span className={cn("bg-gradient-accent flex shrink-0 items-center justify-center rounded-xl text-white", s ? "h-14 w-14" : "h-10 w-10")}>
                    <u.Ikon size={s ? 26 : 18} />
                  </span>
                  <div className={cn(s ? "mt-4" : "mt-3")}>
                    <p className={cn("font-medium text-fg", s ? "text-lg" : "text-sm")}>{u.tittel}</p>
                    <p className="text-[11px] text-fg-faint">{u.tekst}</p>
                  </div>
                  <div className="mt-auto pt-3">
                    {l?.leder ? (
                      <div className="flex items-center gap-2">
                        <Avatar navn={l.leder.navn} bildeUrl={l.leder.bildeUrl} size={s ? 28 : 22} />
                        <span className="truncate text-sm font-medium text-fg">{l.leder.navn}</span>
                        <span className="ml-auto shrink-0 text-xs text-fg-dim tabular-nums">{l.leder.verdi}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-fg-faint">Ingen ennå</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
    </>
  );
}
