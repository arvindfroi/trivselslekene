import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import Card from "@/components/ui/Card";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import RankBadge from "@/components/ui/RankBadge";
import { MapPin } from "lucide-react";

type Stilling = {
  userId: string;
  navn: string;
  totalPoeng: number;
  antallOvelser: number;
};

const statusVariant: Record<string, BadgeVariant> = {
  FULLFORT: "fullfort",
  PAAGAAR: "pagaar",
  PLANLAGT: "planlagt",
};

const statusLabel: Record<string, string> = {
  FULLFORT: "Fullført",
  PAAGAAR: "Pågår",
  PLANLAGT: "Planlagt",
};

export default async function DashboardSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const brukere = await prisma.user.findMany({
    include: {
      individuelleResultater: {
        where: { ovelse: { sesongId: sesong.id } },
      },
      lagmedlemskap: {
        include: {
          lag: { include: { resultat: true, ovelse: true } },
        },
      },
    },
    orderBy: { navn: "asc" },
  });

  const stilling: Stilling[] = brukere
    .map((bruker) => {
      const individOvelser = new Set(
        bruker.individuelleResultater.map((r) => r.ovelseId)
      );
      const poengIndividuelt = bruker.individuelleResultater.reduce(
        (sum, r) => sum + r.poeng,
        0
      );

      const lagOvelser = new Set<string>();
      let poengLag = 0;
      for (const medlemskap of bruker.lagmedlemskap) {
        const { lag } = medlemskap;
        if (lag.ovelse.sesongId !== sesong.id) continue;
        if (lag.resultat) {
          poengLag += lag.resultat.poeng;
          lagOvelser.add(lag.ovelseId);
        }
      }

      return {
        userId: bruker.id,
        navn: bruker.navn,
        totalPoeng: poengIndividuelt + poengLag,
        antallOvelser: new Set([...individOvelser, ...lagOvelser]).size,
      };
    })
    .sort((a, b) => b.totalPoeng - a.totalPoeng);

  const toppPoeng = Math.max(1, ...stilling.map((s) => s.totalPoeng));

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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <p className="animate-fade-up text-xs tracking-[0.3em] text-accent-2 uppercase">
        {sesong.navn}
      </p>
      <h1 className="animate-fade-up mt-1 font-display text-4xl text-fg">
        Dashbord
      </h1>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-widest text-fg-dim uppercase">
            Sammenlagt stilling
          </h2>
          <span className="text-xs text-fg-faint">
            {stilling.length} deltakere
          </span>
        </div>

        <Card padding="p-0" className="animate-fade-up overflow-hidden">
          {stilling.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-fg-dim">
              Ingen resultater er registrert ennå.
            </p>
          ) : (
            <ul>
              {stilling.map((rad, i) => (
                <li
                  key={rad.userId}
                  className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${
                    i !== stilling.length - 1 ? "border-b border-line" : ""
                  } ${i === 0 && rad.totalPoeng > 0 ? "bg-gold/[0.07]" : ""}`}
                >
                  <RankBadge rank={i + 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium text-fg">
                        {rad.navn}
                      </span>
                      <span className="shrink-0 font-display text-lg tabular-nums text-fg">
                        {rad.totalPoeng}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="bg-gradient-accent h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(4, (rad.totalPoeng / toppPoeng) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-fg-faint">
                        {rad.antallOvelser} øvelser
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Øvelser
        </h2>
        {ovelser.length === 0 ? (
          <p className="text-sm text-fg-dim">Ingen øvelser er opprettet ennå.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ovelser.map((ovelse, idx) => (
              <Card
                key={ovelse.id}
                hover
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg text-fg">{ovelse.navn}</h3>
                  <Badge
                    variant={statusVariant[ovelse.status]}
                    pulse={ovelse.status === "PAAGAAR"}
                  >
                    {statusLabel[ovelse.status]}
                  </Badge>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-faint">
                  <span>Vert: {ovelse.vert.navn}</span>
                  {ovelse.lokasjon && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {ovelse.lokasjon}
                    </span>
                  )}
                </p>

                {ovelse.type === "INDIVIDUELL" ? (
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm text-fg-dim">
                    {ovelse.individuelleResultater.map((r) => (
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
                    {ovelse.lag.map((lag) => (
                      <li key={lag.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {lag.resultat?.plassering
                            ? `${lag.resultat.plassering}. `
                            : ""}
                          {lag.navn} (
                          {lag.medlemmer.map((m) => m.user.navn).join(", ")})
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
