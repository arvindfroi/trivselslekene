import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentAlleSesongData, hentStilling } from "@/lib/stilling";
import { slettOvelse } from "@/lib/actions/ovelser";
import {
  statusTekst,
  statusVariant,
} from "@/lib/ovelseLabels";
import Card from "@/components/ui/Card";
import Button, { LinkButton } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import NyOvelseForm from "@/components/NyOvelseForm";
import ProfilRediger from "@/components/ProfilRediger";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";
import { MapPin, Users, Settings2, Trash2, Plus } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Profil" };
}

export default async function ProfilSide({
  searchParams,
}: {
  searchParams: Promise<{ navnfeil?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const { navnfeil } = await searchParams;
  const sesong = await sikreAktivSesong();
  const [bruker, mine, sesongData] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { navn: true, bildeUrl: true },
    }),
    prisma.ovelse.findMany({
      where: { sesongId: sesong.id, vertId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        navn: true,
        status: true,
        type: true,
        lokasjon: true,
        fellesLek: true,
      },
    }),
    hentAlleSesongData(sesong.id),
  ]);
  const stilling = hentStilling(sesongData);

  const stillingTopp8 = stilling.slice(0, 8).map((r) => ({
    userId: r.userId,
    navn: r.navn,
  }));

  async function loggUt() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <DeltakerSlideshow />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-28 pb-12">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
              {session.user.name}
            </p>
            <h1 className="mt-1 font-display text-4xl text-fg">Profil</h1>
            <p className="mt-2 text-sm text-fg-dim">
              Legg til øvelser og styr poengene dine.
            </p>
          </div>
          <form action={loggUt}>
            <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
              Logg ut
            </Button>
          </form>
        </div>

        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <ProfilRediger
              navn={bruker?.navn ?? session.user.name ?? ""}
              bildeUrl={bruker?.bildeUrl ?? null}
              navnFeil={navnfeil}
            />
          </div>
        </div>

      <Card className="mt-6" padding="p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium tracking-widest text-fg-dim uppercase">
          <Plus size={16} /> Ny øvelse
        </h2>
        <NyOvelseForm stillingTopp8={stillingTopp8} />
      </Card>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Dine øvelser
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-fg-dim">
            Du har ingen øvelser ennå. Legg til én over.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((ovelse) => (
              <Card
                key={ovelse.id}
                padding="p-4 sm:p-5"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-lg text-fg">
                      {ovelse.navn}
                    </p>
                    <Badge
                      variant={statusVariant[ovelse.status]}
                      pulse={ovelse.status === "PAAGAAR"}
                    >
                      {statusTekst[ovelse.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-faint">
                    <span>
                      {ovelse.type === "LAG" ? "Lagøvelse" : "Individuell"}
                    </span>
                    {ovelse.lokasjon && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {ovelse.lokasjon}
                      </span>
                    )}
                    {ovelse.fellesLek && (
                      <span className="inline-flex items-center gap-1 text-accent-3">
                        <Users size={12} /> Felles lek
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <LinkButton
                    href={`/ovelser/${ovelse.id}`}
                    variant="secondary"
                    className="px-3 py-2 text-xs"
                  >
                    <Settings2 size={14} /> Administrer
                  </LinkButton>
                  <form action={slettOvelse.bind(null, ovelse.id)}>
                    <Button
                      type="submit"
                      variant="danger"
                      className="px-3 py-2 text-xs"
                    >
                      <Trash2 size={14} /> Slett
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
    </>
  );
}
