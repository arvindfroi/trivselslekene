import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentStilling } from "@/lib/stilling";
import Card from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import RankBadge from "@/components/ui/RankBadge";
import Avatar from "@/components/Avatar";
import AnimatedGradientBackground from "@/components/AnimatedGradientBackground";
import { ArrowRight, BarChart3, Swords, User } from "lucide-react";

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

export default async function HjemSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();
  const [stilling, dineOvelser] = await Promise.all([
    hentStilling(sesong.id),
    prisma.ovelse.count({
      where: { sesongId: sesong.id, vertId: session.user.id },
    }),
  ]);

  const minIndex = stilling.findIndex((s) => s.userId === session.user!.id);
  const min = minIndex >= 0 ? stilling[minIndex] : null;
  const topp = stilling.slice(0, 3);

  return (
    <div className="relative isolate min-h-dvh">
      <div className="pointer-events-none fixed inset-0 z-0">
        <AnimatedGradientBackground Breathing breathingRange={6} />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-28 pb-12">
      <p className="animate-fade-up text-xs tracking-[0.3em] text-accent-2 uppercase">
        {sesong.navn}
      </p>
      <h1 className="animate-fade-up mt-1 font-display text-4xl text-fg">
        Hei, {session.user.name}!
      </h1>
      <p className="animate-fade-up mt-2 text-sm text-fg-dim">
        Velkommen tilbake til lekene.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Plassering"
          verdi={min && min.totalPoeng > 0 ? `#${minIndex + 1}` : "–"}
        />
        <StatCard label="Dine poeng" verdi={String(min?.totalPoeng ?? 0)} />
        <StatCard label="Dine øvelser" verdi={String(dineOvelser)} />
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
                  <Avatar navn={rad.navn} bildeUrl={rad.bildeUrl} size={32} />
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
          <Swords size={18} /> Øvelser
        </LinkButton>
        <LinkButton href="/profil" variant="secondary" className="justify-start">
          <User size={18} /> Profil
        </LinkButton>
      </section>
      </div>
    </div>
  );
}
