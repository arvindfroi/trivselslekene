import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { opprettTestdeltakere, slettTestdeltakere } from "@/lib/actions/testdeltakere";
import Card from "@/components/ui/Card";
import Button, { LinkButton } from "@/components/ui/Button";
import OvelseGrid, { type SpillKort } from "@/components/OvelseGrid";
import { Plus } from "lucide-react";
import LiveRefresh from "@/components/LiveRefresh";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Øvelser" };
}

export default async function OvelserSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const ovelser = await prisma.ovelse.findMany({
    where: { sesongId: sesong.id },
    select: {
      id: true,
      navn: true,
      status: true,
      type: true,
      vertId: true,
      turneringId: true,
      lokasjon: true,
      fellesLek: true,
      kvaliteter: true,
      vert: { select: { id: true, navn: true, farge: true } },
      individuelleResultater: {
        select: { user: { select: { id: true, navn: true } } },
      },
      lag: {
        select: {
          medlemmer: {
            select: { user: { select: { id: true, navn: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const spill: SpillKort[] = ovelser.map((o) => {
    const deltakere = new Map<string, { id: string; navn: string }>();
    for (const r of o.individuelleResultater) {
      deltakere.set(r.user.id, { id: r.user.id, navn: r.user.navn });
    }
    for (const lag of o.lag) {
      for (const m of lag.medlemmer) {
        deltakere.set(m.user.id, { id: m.user.id, navn: m.user.navn });
      }
    }
    return {
      id: o.id,
      navn: o.navn,
      status: o.status,
      type: o.type,
      vertNavn: o.vert.navn,
      vertId: o.vertId,
      vertFarge: o.vert.farge,
      lokasjon: o.lokasjon,
      fellesLek: o.fellesLek,
      kvaliteter: o.kvaliteter,
      deltakere: [...deltakere.values()],
      turneringId: o.turneringId,
    };
  });

  return (
    <>
        <LiveRefresh aktiv />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
              {sesong.navn}
            </p>
            <h1 className="mt-1 font-display text-4xl text-fg">Øvelser</h1>
            <p className="mt-2 max-w-xl text-sm text-fg-dim">
              Alle lekene i ett rutenett. Trykk på et kort for å utvide det og se
              egenskaper og deltakere.
            </p>
          </div>
          <div className="hidden sm:flex shrink-0 items-center gap-2">
            <form action={opprettTestdeltakere}>
              <Button type="submit" variant="outline" className="px-3 py-2 text-xs">
                Testdeltakere
              </Button>
            </form>
            <form action={slettTestdeltakere}>
              <Button type="submit" variant="danger" className="px-3 py-2 text-xs">
                Slett testdata
              </Button>
            </form>
            <LinkButton href="/profil?ny=1#ny-ovelse" className="shrink-0 px-4">
              <Plus size={16} /> Ny øvelse
            </LinkButton>
          </div>
        </div>

        {/* Mobil: Ny øvelse — primær CTA, alltid synlig */}
        <div className="mt-4 sm:hidden">
          <LinkButton href="/profil?ny=1#ny-ovelse" className="w-full justify-center px-4">
            <Plus size={18} /> Ny øvelse
          </LinkButton>
        </div>

      {ovelser.length === 0 ? (
        <Card className="mt-8 text-center" padding="p-10">
          <p className="text-sm text-fg-dim">Ingen øvelser er opprettet ennå.</p>
          <div className="mt-4 flex justify-center">
            <LinkButton href="/profil?ny=1#ny-ovelse">
              <Plus size={16} /> Opprett den første
            </LinkButton>
          </div>
        </Card>
      ) : (
        <div className="mt-8">
          <OvelseGrid spill={spill} currentUserId={session.user.id} />
        </div>
      )}
    </>
  );
}
