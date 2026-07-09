import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { bildeUrlFor } from "@/lib/bilde";
import { registrerVinner, slettFotballKamp } from "@/lib/actions/fotballkamp";
import Card from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";
import Avatar from "@/components/Avatar";
import { statusTekst, statusVariant } from "@/lib/ovelseLabels";
import { MapPin, Swords, Trash2, Trophy } from "lucide-react";

export default async function FotballKampSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const kamper = await prisma.ovelse.findMany({
    where: {
      sesongId: sesong.id,
      lagFormat: { in: ["FIRE_MOT_FEM", "TRE_MOT_TRE_MOT_TRE", "TO_MOT_TO_MOT_TO_MOT_TO", "ANNET"] },
    },
    include: {
      // Eksplisitte selects: unngår å dra passordHash og base64-bilder
      // ut av databasen for hver render.
      vert: { select: { id: true, navn: true } },
      lag: {
        include: {
          medlemmer: {
            include: { user: { select: { id: true, navn: true, bildeUrl: true } } },
          },
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
            <h1 className="mt-1 font-display text-4xl text-fg">Lag</h1>
            <p className="mt-2 max-w-xl text-sm text-fg-dim">
              4 mot 5 — lag settes automatisk fra stillingen. Vinnerlaget får poeng.
            </p>
          </div>
        </div>

        {/* Kampliste */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
            Kamper
          </h2>

          {kamper.length === 0 ? (
            <p className="text-sm text-fg-dim">
              Ingen lagkamper er opprettet ennå. Gå til{" "}
              <a href="/profil" className="text-accent-2 underline">Profil</a> for
              å opprette en.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {kamper.map((kamp) => {
                const erVert = session.user.id === kamp.vertId;
                const erFerdig = kamp.status === "FULLFORT";
                const vinner = kamp.lag.find((l) => l.resultat?.plassering === 1) ?? null;
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
                      <div className="flex items-center gap-2">
                        <LinkButton
                          href={`/ovelser/${kamp.id}`}
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                        >
                          Rediger lag
                        </LinkButton>
                        {erVert && (
                          <form action={slettFotballKamp.bind(null, kamp.id)}>
                            <SubmitButton variant="danger" className="px-3 py-1.5 text-xs" pendingText="Sletter…">
                              <Trash2 size={14} /> Slett
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </div>

                    {/* Lag-oppstilling */}
                    <div className={`mt-4 grid grid-cols-1 gap-3 ${kamp.lag.length >= 4 ? "sm:grid-cols-4" : kamp.lag.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                      {kamp.lag.map((lag) => {
                        const erVinner = erFerdig && lag.resultat?.plassering === 1;
                        const erTaper = erFerdig && lag.resultat?.plassering !== 1 && lag.resultat !== null;

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
                              <span className="text-sm font-medium text-fg">{lag.navn}</span>
                              <span className="text-xs text-fg-faint">
                                {lag.medlemmer.length} spillere
                              </span>
                            </div>

                            {lag.medlemmer.length === 0 ? (
                              <p className="text-xs text-fg-faint">Ingen spillere</p>
                            ) : (
                              <ul className="flex flex-col gap-1.5">
                                {lag.medlemmer.map((m) => (
                                  <li key={m.id} className="flex items-center gap-2 text-sm text-fg">
                                    <Avatar navn={m.user.navn} bildeUrl={bildeUrlFor("bruker", m.user)} size={24} />
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

                            {erVert && !erFerdig && lag.medlemmer.length > 0 && (
                              <form action={velgVinner} className="mt-3">
                                <SubmitButton className="w-full justify-center py-2 text-xs" pendingText="Registrerer…">
                                  <Trophy size={14} /> {lag.navn} vant kampen
                                </SubmitButton>
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
