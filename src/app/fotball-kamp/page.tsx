import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { opprettFotballKamp, registrerVinner } from "@/lib/actions/fotballkamp";
import Card from "@/components/ui/Card";
import Button, { LinkButton } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";
import Avatar from "@/components/Avatar";
import { statusTekst, statusVariant } from "@/lib/ovelseLabels";
import { MapPin, Plus, Swords, Trophy } from "lucide-react";

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
            <p className="mt-2 max-w-xl text-sm text-fg-dim">
              4 mot 5 — lagene settes automatisk fra stillingen (1.→4-lag, 2.→5-lag, 3.→4-lag, …). Vinnerlaget får poeng.
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
            <p className="text-sm text-fg-dim">
              Ingen fotballkamper er opprettet ennå.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {kamper.map((kamp) => {
                const lag1 = kamp.lag[0]; // Lag 1 (4)
                const lag2 = kamp.lag[1]; // Lag 2 (5)
                const erVert = session.user.id === kamp.vertId;
                const erFerdig = kamp.status === "FULLFORT";
                const vinner =
                  lag1?.resultat?.plassering === 1
                    ? lag1
                    : lag2?.resultat?.plassering === 1
                      ? lag2
                      : null;
                const poeng = vinner?.resultat?.poeng ?? 0;

                return (
                  <Card key={kamp.id} padding="p-5 sm:p-6">
                    {/* Header */}
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
                          {erFerdig && vinner && (
                            <span className="inline-flex items-center gap-1 text-accent-2">
                              <Trophy size={11} /> {vinner.navn} vant ({poeng} p per spiller)
                            </span>
                          )}
                        </p>
                      </div>
                      <LinkButton
                        href={`/ovelser/${kamp.id}`}
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                      >
                        Rediger lag
                      </LinkButton>
                    </div>

                    {/* Lag-oppstilling */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[lag1, lag2].map((lag) => {
                        if (!lag) return null;
                        const maxSpillere = lag === lag1 ? 4 : 5;
                        const erVinner =
                          erFerdig && lag.resultat?.plassering === 1;
                        const erTaper =
                          erFerdig && lag.resultat?.plassering !== 1;

                        async function velgVinner() {
                          "use server";
                          await registrerVinner(kamp.id, lag.id, 3);
                        }

                        return (
                          <div
                            key={lag.id}
                            className={`rounded-xl border p-4 ${
                              erVinner
                                ? "border-accent-2 bg-accent-2/10"
                                : erTaper
                                  ? "border-line opacity-60"
                                  : "border-line bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-fg">
                                {lag.navn}
                              </span>
                              <span className="text-xs text-fg-faint">
                                {lag.medlemmer.length}/{maxSpillere} spillere
                              </span>
                            </div>

                            {lag.medlemmer.length === 0 ? (
                              <p className="text-xs text-fg-faint">
                                Ingen spillere tildelt — settes automatisk fra stilling ved opprettelse
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-1.5">
                                {lag.medlemmer.map((m) => (
                                  <li
                                    key={m.id}
                                    className="flex items-center gap-2 text-sm text-fg"
                                  >
                                    <Avatar
                                      navn={m.user.navn}
                                      bildeUrl={m.user.bildeUrl}
                                      size={24}
                                    />
                                    <span>{m.user.navn}</span>
                                    {erFerdig && lag.resultat && (
                                      <span className="ml-auto text-xs tabular-nums text-accent-2">
                                        +{lag.resultat.poeng} p
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Vinner-knapp (kun for vert, når kampen ikke er ferdig) */}
                            {erVert && !erFerdig && lag.medlemmer.length > 0 && (
                              <form action={velgVinner} className="mt-3">
                                <Button
                                  type="submit"
                                  className="w-full justify-center py-2 text-xs"
                                >
                                  <Trophy size={14} /> {lag.navn} vant kampen
                                </Button>
                              </form>
                            )}

                            {erVinner && (
                              <p className="mt-2 text-center text-xs font-medium text-accent-2">
                                🏆 Vinnerlag — {poeng} poeng per spiller
                              </p>
                            )}
                          </div>
                        );
                      })}
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
