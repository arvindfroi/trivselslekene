import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentAlleSesongData, hentStilling } from "@/lib/stilling";
import Card from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import RankBadge from "@/components/ui/RankBadge";
import Avatar from "@/components/Avatar";
import FinaleInngang from "@/components/FinaleInngang";
import { ArrowRight, BarChart3, Swords, User } from "lucide-react";
import LiveRefresh from "@/components/LiveRefresh";
import Nedtelling from "@/components/Nedtelling";
import { AVSLORINGSTIDSPUNKT_ISO, erAvslort } from "@/lib/avsloring";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Dashboard" };
}

export default async function HjemSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();
  const [alleData, dineOvelser, antallOvelser, antallFullfort] = await Promise.all([
    hentAlleSesongData(sesong.id),
    prisma.ovelse.count({
      where: { sesongId: sesong.id, vertId: session.user.id },
    }),
    prisma.ovelse.count({ where: { sesongId: sesong.id } }),
    prisma.ovelse.count({ where: { sesongId: sesong.id, status: "FULLFORT" } }),
  ]);
  const stilling = hentStilling(alleData);

  const minIndex = stilling.findIndex((s) => s.userId === session.user!.id);
  const min = minIndex >= 0 ? stilling[minIndex] : null;
  const topp = stilling.slice(0, 3);
  const avslort = erAvslort();

  return (
    <>
      <LiveRefresh aktiv />
      <p className="animate-fade-up text-xs tracking-[0.3em] text-accent-2 uppercase">
        {sesong.navn}
      </p>
      <div className="animate-fade-up mt-1 flex items-center gap-3">
        {/* Profilbilde — klikk fører til profilsiden */}
        <Link
          href="/profil"
          aria-label="Gå til profilen din"
          className="shrink-0 rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent-2"
        >
          <Avatar
            navn={min?.navn ?? session.user.name ?? ""}
            bildeUrl={min?.bildeUrl}
            farge={min?.farge}
            size={52}
          />
        </Link>
        <h1 className="font-display text-4xl text-fg">
          Hei, {session.user.name}!
        </h1>
      </div>
      <p className="animate-fade-up mt-2 text-sm text-fg-dim">
        Velkommen tilbake til lekene.
      </p>

      {!avslort && (
        <div className="mt-6 animate-fade-up">
          <Nedtelling maalISO={AVSLORINGSTIDSPUNKT_ISO} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Plassering"
          verdi={min && min.totalPoeng > 0 ? `#${minIndex + 1}` : "–"}
        />
        <StatCard label="Dine poeng" verdi={String(min?.totalPoeng ?? 0)} />
        <StatCard label="Dine leker" verdi={String(dineOvelser)} />
      </div>

      {/* Sesongslutt-varsel: dukker bare opp når alle leker er ferdige */}
      <div className="mt-6 animate-fade-up">
        <FinaleInngang
          antallFullfort={antallFullfort}
          antallOvelser={antallOvelser}
          variant="banner"
        />
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-widest text-fg-dim uppercase">
            Toppen av stillingen
          </h2>
          <Link
            href="/stilling"
            className="inline-flex items-center gap-1 text-sm text-fg-dim transition-colors hover:text-fg"
          >
            Se alle <ArrowRight size={14} />
          </Link>
        </div>
        <Card padding="p-0" className="overflow-hidden">
          {topp.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-fg-dim">
              Ingen resultater ennå.
            </p>
          ) : (
            <ul>
              {topp.map((rad, i) => (
                <li
                  key={rad.userId}
                  className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${
                    i !== topp.length - 1 ? "border-b border-line" : ""
                  } ${i === 0 && rad.totalPoeng > 0 ? "bg-gold/[0.07]" : ""}`}
                >
                  <RankBadge rank={i + 1} />
                  <Avatar navn={rad.navn} bildeUrl={rad.bildeUrl} farge={rad.farge} size={32} />
                  <span className="flex-1 truncate font-medium text-fg">
                    {rad.navn}
                  </span>
                  <span className="font-display text-lg tabular-nums text-fg">
                    {rad.totalPoeng}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LinkButton href="/stilling" variant="secondary" className="justify-start">
          <BarChart3 size={18} /> Statistikk
        </LinkButton>
        <LinkButton href="/ovelser" variant="secondary" className="justify-start">
          <Swords size={18} /> Leker
        </LinkButton>
        <LinkButton href="/profil" variant="secondary" className="justify-start">
          <User size={18} /> Profil
        </LinkButton>
      </section>
    </>
  );
}
