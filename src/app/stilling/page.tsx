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
import type { SpillerDetalj } from "@/lib/stilling";
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

  // Steg 1: Data
  const [sesongData, antallOvelser, antallFullfort] = await Promise.all([
    hentAlleSesongData(sesong.id),
    prisma.ovelse.count({ where: { sesongId: sesong.id } }),
    prisma.ovelse.count({ where: { sesongId: sesong.id, status: "FULLFORT" } }),
  ]);

  // Steg 2: Kun stilling
  const stilling = hentStilling(sesongData);
  const toppPoeng = Math.max(1, ...stilling.map((s) => s.totalPoeng));
  const leder = stilling.find((s) => s.totalPoeng > 0);

  // Steg 3A: Prøv hentSpillerdetaljer
  let detaljer: Record<string, SpillerDetalj> = {};
  let detaljFeil: string | null = null;
  try { detaljer = hentSpillerdetaljer(sesongData); } catch (e: unknown) { detaljFeil = String(e); }

  // Steg 3B: Prøv hentKvalitetsledere
  let kvalitetsFeil: string | null = null;
  try { void hentKvalitetsledere(sesongData); } catch (e: unknown) { kvalitetsFeil = String(e); }

  // Steg 3C: Prøv hentUtmerkelser
  let utmerkelseFeil: string | null = null;
  try { void hentUtmerkelser(sesongData); } catch (e: unknown) { utmerkelseFeil = String(e); }

  const harFeil = detaljFeil || kvalitetsFeil || utmerkelseFeil;

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

        {harFeil && (
          <div className="surface mt-6 rounded-2xl p-4">
            <p className="text-sm text-red-400 font-medium">Debug-feil:</p>
            {detaljFeil && <p className="text-xs text-fg-dim mt-1">Spillerdetaljer: {detaljFeil}</p>}
            {kvalitetsFeil && <p className="text-xs text-fg-dim mt-1">Kvalitetsledere: {kvalitetsFeil}</p>}
            {utmerkelseFeil && <p className="text-xs text-fg-dim mt-1">Utmerkelser: {utmerkelseFeil}</p>}
          </div>
        )}

        {!harFeil && (
          <>
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
          </>
        )}
      </div>
    </>
  );
}
