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
  type KvalitetsLeder,
  type SpillerDetalj,
} from "@/lib/stilling";
import { kvalitetIkon, kvalitetTekst } from "@/lib/ovelseLabels";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import StillingListe from "@/components/StillingListe";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";

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
    prisma.ovelse.count({ where: { sesongId: sesong.id, status: "FULLFORT" } }),
  ]);

  const stilling = hentStilling(sesongData);
  const detaljer: Record<string, SpillerDetalj> = hentSpillerdetaljer(sesongData);
  const kvalitetsledere: KvalitetsLeder[] = hentKvalitetsledere(sesongData);
  const toppPoeng = Math.max(1, ...stilling.map((s) => s.totalPoeng));
  const leder = stilling.find((s) => s.totalPoeng > 0);

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

        {/* Minimal StatFlis: kun div + ikon + tekst, ingen framer-motion */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">Beste innen hver egenskap</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kvalitetsledere.map(({ kvalitet }) => {
              const Ikon = kvalitetIkon[kvalitet];
              return (
                <div key={kvalitet} className="surface rounded-2xl p-4">
                  <span className="bg-gradient-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                    <Ikon size={18} />
                  </span>
                  <p className="mt-3 text-sm font-medium text-fg">{kvalitetTekst[kvalitet]}</p>
                  <p className="text-sm text-fg-faint">Ingen ennå</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
