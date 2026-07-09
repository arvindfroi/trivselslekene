import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { opprettFotballKamp } from "@/lib/actions/fotballkamp";
import Card from "@/components/ui/Card";
import Button, { LinkButton } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";
import { statusTekst, statusVariant } from "@/lib/ovelseLabels";
import { MapPin, Plus, Swords, Users } from "lucide-react";

export default async function FotballKampSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const kamper = await prisma.ovelse.findMany({
    where: { sesongId: sesong.id, lagFormat: "FIRE_MOT_FEM" },
    include: {
      vert: true,
      lag: {
        include: {
          medlemmer: { include: { user: true } },
          resultat: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <DeltakerSlideshow />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-28 pb-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
              {sesong.navn}
            </p>
            <h1 className="mt-1 font-display text-4xl text-fg">Fotball kamp</h1>
            <p className="mt-2 text-sm text-fg-dim">
              4 mot 5 — opprett kamper, sett opp lag og registrer resultater.
            </p>
          </div>
        </div>

        {/* Ny kamp */}
        <Card className="mt-8" padding="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium tracking-widest text-fg-dim uppercase">
            <Plus size={16} /> Ny fotballkamp
          </h2>
          <form action={opprettFotballKamp} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="navn">Navn på kampen</Label>
                <Input
                  id="navn"
                  name="navn"
                  required
                  placeholder="F.eks. Fotballkamp runde 1"
                />
              </div>
              <div>
                <Label htmlFor="lokasjon">Lokasjon</Label>
                <Input
                  id="lokasjon"
                  name="lokasjon"
                  placeholder="F.eks. kunstgressbanen"
                />
              </div>
            </div>
            <Button type="submit" className="self-start">
              Opprett kamp
            </Button>
          </form>
        </Card>

        {/* Kampliste */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
            Kamper
          </h2>

          {kamper.length === 0 ? (
            <p className="text-sm text-fg-dim">Ingen fotballkamper er opprettet ennå.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {kamper.map((kamp) => {
                const lag1 = kamp.lag[0]; // Lag 1 (4)
                const lag2 = kamp.lag[1]; // Lag 2 (5)

                return (
                  <Card key={kamp.id} padding="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Swords size={18} className="text-accent-2" />
                          <h3 className="font-display text-lg text-fg">
                            {kamp.navn}
                          </h3>
                          <Badge
                            variant={statusVariant[kamp.status]}
                            pulse={kamp.status === "PAAGAAR"}
                          >
                            {statusTekst[kamp.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-fg-faint">
                          <span>Vert: {kamp.vert.navn}</span>
                          {kamp.lokasjon && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} /> {kamp.lokasjon}
                            </span>
                          )}
                        </p>
                      </div>
                      <LinkButton
                        href={`/ovelser/${kamp.id}`}
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                      >
                        Administrer
                      </LinkButton>
                    </div>

                    {/* Lag-oppstilling */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Lag 1 (4 spillere) */}
                      {lag1 && (
                        <div className="rounded-xl border border-line bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-fg">
                              {lag1.navn}
                            </span>
                            <span className="text-xs text-fg-faint">
                              {lag1.medlemmer.length}/4 spillere
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {lag1.medlemmer.map((m) => (
                              <span
                                key={m.id}
                                className="rounded-full border border-line bg-white/[0.05] px-2.5 py-0.5 text-xs text-fg"
                              >
                                <Users size={11} className="mr-1 inline text-fg-faint" />
                                {m.user.navn}
                              </span>
                            ))}
                            {lag1.medlemmer.length === 0 && (
                              <span className="text-xs text-fg-faint">
                                Ingen spillere
                              </span>
                            )}
                          </div>
                          {lag1.resultat && (
                            <p className="mt-2 text-xs tabular-nums text-accent-2">
                              {lag1.resultat.poeng} poeng
                              {lag1.resultat.plassering
                                ? ` · ${lag1.resultat.plassering}. plass`
                                : ""}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Lag 2 (5 spillere) */}
                      {lag2 && (
                        <div className="rounded-xl border border-line bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-fg">
                              {lag2.navn}
                            </span>
                            <span className="text-xs text-fg-faint">
                              {lag2.medlemmer.length}/5 spillere
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {lag2.medlemmer.map((m) => (
                              <span
                                key={m.id}
                                className="rounded-full border border-line bg-white/[0.05] px-2.5 py-0.5 text-xs text-fg"
                              >
                                <Users size={11} className="mr-1 inline text-fg-faint" />
                                {m.user.navn}
                              </span>
                            ))}
                            {lag2.medlemmer.length === 0 && (
                              <span className="text-xs text-fg-faint">
                                Ingen spillere
                              </span>
                            )}
                          </div>
                          {lag2.resultat && (
                            <p className="mt-2 text-xs tabular-nums text-accent-2">
                              {lag2.resultat.poeng} poeng
                              {lag2.resultat.plassering
                                ? ` · ${lag2.resultat.plassering}. plass`
                                : ""}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
