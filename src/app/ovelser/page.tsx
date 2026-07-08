import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import Card from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import BentoBrett, {
  type SpillKort,
  type SpillerKort,
} from "@/components/BentoBrett";
import { Plus } from "lucide-react";

export default async function OvelserSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const [ovelser, alleBrukere] = await Promise.all([
    prisma.ovelse.findMany({
      where: { sesongId: sesong.id },
      include: {
        vert: true,
        individuelleResultater: { include: { user: true } },
        lag: { include: { medlemmer: { include: { user: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, navn: true, bildeUrl: true },
      orderBy: { navn: "asc" },
    }),
  ]);

  // Egenskaper per spiller (fra lekene de deltar i).
  const spillerKvaliteter = new Map<string, Set<string>>();
  const leggTil = (userId: string, kvaliteter: string[]) => {
    const sett = spillerKvaliteter.get(userId) ?? new Set<string>();
    kvaliteter.forEach((k) => sett.add(k));
    spillerKvaliteter.set(userId, sett);
  };

  const spill: SpillKort[] = ovelser.map((o) => {
    const deltakere = new Map<string, { id: string; navn: string }>();
    for (const r of o.individuelleResultater) {
      deltakere.set(r.user.id, { id: r.user.id, navn: r.user.navn });
      leggTil(r.user.id, o.kvaliteter);
    }
    for (const lag of o.lag) {
      for (const m of lag.medlemmer) {
        deltakere.set(m.user.id, { id: m.user.id, navn: m.user.navn });
        leggTil(m.user.id, o.kvaliteter);
      }
    }
    return {
      id: o.id,
      navn: o.navn,
      status: o.status,
      type: o.type,
      vertNavn: o.vert.navn,
      vertId: o.vertId,
      kvaliteter: o.kvaliteter,
      deltakere: [...deltakere.values()],
    };
  });

  const spillere: SpillerKort[] = alleBrukere.map((u) => ({
    id: u.id,
    navn: u.navn,
    bildeUrl: u.bildeUrl,
    kvaliteter: [...(spillerKvaliteter.get(u.id) ?? [])] as SpillerKort["kvaliteter"],
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-28 pb-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
            {sesong.navn}
          </p>
          <h1 className="mt-1 font-display text-4xl text-fg">Øvelser</h1>
          <p className="mt-2 max-w-xl text-sm text-fg-dim">
            Alle lekene i ett rutenett. Trykk på en flis eller en spiller for å
            se egenskapene som er i spill.
          </p>
        </div>
        <LinkButton href="/profil" className="hidden shrink-0 px-4 sm:inline-flex">
          <Plus size={16} /> Ny øvelse
        </LinkButton>
      </div>

      {ovelser.length === 0 ? (
        <Card className="mt-8 text-center" padding="p-10">
          <p className="text-sm text-fg-dim">Ingen øvelser er opprettet ennå.</p>
          <div className="mt-4 flex justify-center">
            <LinkButton href="/profil">
              <Plus size={16} /> Opprett den første
            </LinkButton>
          </div>
        </Card>
      ) : (
        <div className="mt-8">
          <BentoBrett spill={spill} spillere={spillere} />
        </div>
      )}
    </div>
  );
}
