import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { statusTekst, statusVariant } from "@/lib/ovelseLabels";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { MapPin, Users, Plus } from "lucide-react";

export default async function OvelserSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const ovelser = await prisma.ovelse.findMany({
    where: { sesongId: sesong.id },
    include: {
      vert: true,
      individuelleResultater: { include: { user: true }, orderBy: { poeng: "desc" } },
      lag: { include: { resultat: true, medlemmer: { include: { user: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
            {sesong.navn}
          </p>
          <h1 className="mt-1 font-display text-4xl text-fg">Øvelser</h1>
          <p className="mt-2 max-w-xl text-sm text-fg-dim">
            Alle lekene og resultatene så langt.
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
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ovelser.map((ovelse, idx) => (
            <Link key={ovelse.id} href={`/ovelser/${ovelse.id}`}>
              <Card
                hover
                className="animate-fade-up h-full"
                style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg text-fg">{ovelse.navn}</h3>
                  <Badge
                    variant={statusVariant[ovelse.status]}
                    pulse={ovelse.status === "PAAGAAR"}
                  >
                    {statusTekst[ovelse.status]}
                  </Badge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-faint">
                  <span>Vert: {ovelse.vert.navn}</span>
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

                {ovelse.type === "INDIVIDUELL" ? (
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm text-fg-dim">
                    {ovelse.individuelleResultater.slice(0, 4).map((r) => (
                      <li key={r.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {r.plassering ? `${r.plassering}. ` : ""}
                          {r.user.navn}
                        </span>
                        <span className="shrink-0 tabular-nums text-fg">
                          {r.poeng} p
                        </span>
                      </li>
                    ))}
                    {ovelse.individuelleResultater.length === 0 && (
                      <li className="text-fg-faint">Ingen resultater ennå</li>
                    )}
                  </ul>
                ) : (
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm text-fg-dim">
                    {ovelse.lag.slice(0, 4).map((lag) => (
                      <li key={lag.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {lag.resultat?.plassering
                            ? `${lag.resultat.plassering}. `
                            : ""}
                          {lag.navn}
                        </span>
                        <span className="shrink-0 tabular-nums text-fg">
                          {lag.resultat ? `${lag.resultat.poeng} p` : "–"}
                        </span>
                      </li>
                    ))}
                    {ovelse.lag.length === 0 && (
                      <li className="text-fg-faint">Ingen lag ennå</li>
                    )}
                  </ul>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
