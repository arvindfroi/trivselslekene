import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import {
  hentKvalitetsledere,
  hentSpillerdetaljer,
  hentStilling,
  hentUtmerkelser,
} from "@/lib/stilling";
import { kvalitetIkon, kvalitetTekst } from "@/lib/ovelseLabels";
import Card from "@/components/ui/Card";
import Avatar from "@/components/Avatar";
import StillingListe from "@/components/StillingListe";
import {
  Crown,
  Flame,
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
];

function StatCard({ label, verdi }: { label: string; verdi: string }) {
  return (
    <Card padding="p-4 sm:p-5">
      <p className="text-[11px] tracking-widest text-fg-faint uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-fg sm:text-3xl">{verdi}</p>
    </Card>
  );
}

export default async function StillingSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();
  const [
    stilling,
    detaljer,
    kvalitetsledere,
    utmerkelser,
    antallOvelser,
    antallFullfort,
  ] = await Promise.all([
    hentStilling(sesong.id),
    hentSpillerdetaljer(sesong.id),
    hentKvalitetsledere(sesong.id),
    hentUtmerkelser(sesong.id),
    prisma.ovelse.count({ where: { sesongId: sesong.id } }),
    prisma.ovelse.count({
      where: { sesongId: sesong.id, status: "FULLFORT" },
    }),
  ]);
  const toppPoeng = Math.max(1, ...stilling.map((s) => s.totalPoeng));
  const leder = stilling.find((s) => s.totalPoeng > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
      <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
        {sesong.navn}
      </p>
      <h1 className="mt-1 font-display text-4xl text-fg">Stilling</h1>
      <p className="mt-2 text-sm text-fg-dim">
        Sammenlagt stilling og statistikk for lekene.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Deltakere" verdi={String(stilling.length)} />
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
          {stilling.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-fg-dim">
              Ingen resultater er registrert ennå.
            </p>
          ) : (
            <StillingListe
              rader={stilling}
              detaljer={detaljer}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {kvalitetsledere.map(({ kvalitet, leder: best }) => (
            <Card
              key={kvalitet}
              padding="p-4"
              className="flex items-center gap-3"
            >
              {(() => {
                const Ikon = kvalitetIkon[kvalitet];
                return (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-accent-2">
                    <Ikon size={18} />
                  </span>
                );
              })()}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] tracking-widest text-fg-faint uppercase">
                  {kvalitetTekst[kvalitet]}
                </p>
                {best ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Avatar navn={best.navn} bildeUrl={best.bildeUrl} size={24} />
                    <span className="truncate text-sm font-medium text-fg">
                      {best.navn}
                    </span>
                    <span className="ml-auto shrink-0 font-display tabular-nums text-fg">
                      {best.poeng}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-fg-faint">Ingen ennå</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Rekorder og utmerkelser
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {UTMERKELSER.map((u) => {
            const l = utmerkelser.find((x) => x.key === u.key)?.leder ?? null;
            const Ikon = u.Ikon;
            return (
              <Card
                key={u.key}
                padding="p-4"
                className="flex items-center gap-3"
              >
                <span className="bg-gradient-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white">
                  <Ikon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{u.tittel}</p>
                  <p className="text-[11px] text-fg-faint">{u.tekst}</p>
                  {l ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Avatar navn={l.navn} bildeUrl={l.bildeUrl} size={22} />
                      <span className="truncate text-sm text-fg">{l.navn}</span>
                      <span className="ml-auto shrink-0 text-xs text-fg-dim">
                        {l.verdi}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-sm text-fg-faint">Ingen ennå</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
