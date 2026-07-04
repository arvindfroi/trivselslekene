import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fjernLagmedlem,
  lagreResultatIndividuell,
  lagreResultatLag,
  leggTilLagmedlem,
  opprettLag,
  settOvelseStatus,
} from "@/lib/actions/ovelser";
import type { OvelseStatus } from "@prisma/client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Field";
import { X } from "lucide-react";

const statusVariant: Record<OvelseStatus, BadgeVariant> = {
  FULLFORT: "fullfort",
  PAAGAAR: "pagaar",
  PLANLAGT: "planlagt",
};

export default async function OvelseSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/logg-inn");

  const ovelse = await prisma.ovelse.findUnique({
    where: { id },
    include: {
      vert: true,
      sesong: true,
      individuelleResultater: { include: { user: true }, orderBy: { poeng: "desc" } },
      lag: {
        include: {
          medlemmer: { include: { user: true } },
          resultat: true,
        },
      },
    },
  });

  if (!ovelse) notFound();

  const ovelseId = ovelse.id;
  const alleBrukere = await prisma.user.findMany({ orderBy: { navn: "asc" } });
  const deltakere = alleBrukere.filter((b) => b.id !== ovelse.vertId);
  const erVert = session.user.id === ovelse.vertId;

  async function endreStatus(formData: FormData) {
    "use server";
    const status = formData.get("status") as OvelseStatus;
    await settOvelseStatus(ovelseId, status);
  }

  async function opprettLagAction(formData: FormData) {
    "use server";
    await opprettLag(ovelseId, formData);
  }

  async function lagreIndividueltAction(formData: FormData) {
    "use server";
    await lagreResultatIndividuell(ovelseId, formData);
  }

  const statusTekst: Record<OvelseStatus, string> = {
    PLANLAGT: "Planlagt",
    PAAGAAR: "Pågår",
    FULLFORT: "Fullført",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-[11px] tracking-widest text-coral-dark uppercase">
            {ovelse.sesong.navn} · Vert: {ovelse.vert.navn}
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
            {ovelse.navn}
          </h1>
          {ovelse.beskrivelse && (
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              {ovelse.beskrivelse}
            </p>
          )}
        </div>
        <Badge
          variant={statusVariant[ovelse.status]}
          pulse={ovelse.status === "PAAGAAR"}
          className="shrink-0"
        >
          {statusTekst[ovelse.status]}
        </Badge>
      </div>

      {erVert ? (
        <form
          action={endreStatus}
          className="mt-5 inline-flex flex-wrap gap-0 border-2 border-ink"
        >
          {(["PLANLAGT", "PAAGAAR", "FULLFORT"] as OvelseStatus[]).map(
            (s, i) => (
              <button
                key={s}
                type="submit"
                name="status"
                value={s}
                className={`px-3.5 py-2 font-display text-[11px] tracking-widest uppercase transition-colors ${
                  i > 0 ? "border-l-2 border-ink" : ""
                } ${
                  ovelse.status === s
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink hover:bg-paper-soft"
                }`}
              >
                {statusTekst[s]}
              </button>
            )
          )}
        </form>
      ) : (
        <p className="mt-5 border-2 border-ink/20 bg-paper-soft px-4 py-2.5 text-sm text-ink-soft">
          Kun verten ({ovelse.vert.navn}) kan registrere resultater og endre
          status for denne øvelsen.
        </p>
      )}

      {ovelse.type === "INDIVIDUELL" ? (
        <Card className="mt-8" padding="p-5 sm:p-6">
          <h2 className="mb-4 font-display text-sm tracking-widest text-ink uppercase">
            Resultater
          </h2>

          {ovelse.individuelleResultater.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-soft">
              Ingen resultater registrert ennå
            </p>
          ) : (
            <ul className="flex flex-col">
              {ovelse.individuelleResultater.map((r, i) => (
                <li
                  key={r.id}
                  className={`flex items-center justify-between gap-3 py-2.5 ${
                    i !== ovelse.individuelleResultater.length - 1
                      ? "border-b border-ink/10"
                      : ""
                  }`}
                >
                  <span className="text-sm">
                    <span className="font-scoreboard mr-2 text-ink-soft">
                      {r.plassering ? `${r.plassering}.` : "–"}
                    </span>
                    {r.user.navn}
                  </span>
                  <span className="font-scoreboard text-sm">{r.poeng} p</span>
                </li>
              ))}
            </ul>
          )}

          {erVert && (
            <form
              action={lagreIndividueltAction}
              className="mt-5 flex flex-wrap items-end gap-3 border-t-2 border-ink/10 pt-5"
            >
              <div className="min-w-[9rem] flex-1">
                <Label htmlFor="userId">Deltaker</Label>
                <Select id="userId" name="userId" required>
                  {deltakere.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.navn}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-24">
                <Label htmlFor="plassering">Plassering</Label>
                <Input id="plassering" type="number" name="plassering" min={1} />
              </div>
              <div className="w-28">
                <Label htmlFor="poeng">Poeng</Label>
                <Input
                  id="poeng"
                  type="number"
                  name="poeng"
                  step="0.5"
                  required
                />
              </div>
              <Button type="submit">Lagre</Button>
            </form>
          )}
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          {erVert && (
            <Card padding="p-5 sm:p-6">
              <h2 className="mb-4 font-display text-sm tracking-widest text-ink uppercase">
                Opprett lag
              </h2>
              <form action={opprettLagAction} className="flex gap-3">
                <Input name="navn" required placeholder="Lagnavn" className="flex-1" />
                <Button type="submit">Legg til lag</Button>
              </form>
            </Card>
          )}

          {ovelse.lag.map((lag) => {
            async function leggTilMedlemAction(formData: FormData) {
              "use server";
              await leggTilLagmedlem(ovelseId, lag.id, formData);
            }
            async function fjernMedlemAction(formData: FormData) {
              "use server";
              const lagmedlemId = String(formData.get("lagmedlemId") ?? "");
              if (lagmedlemId) await fjernLagmedlem(ovelseId, lagmedlemId);
            }
            async function lagreResultatAction(formData: FormData) {
              "use server";
              await lagreResultatLag(ovelseId, lag.id, formData);
            }

            const medlemIder = new Set(lag.medlemmer.map((m) => m.userId));
            const tilgjengelige = deltakere.filter((d) => !medlemIder.has(d.id));

            return (
              <Card key={lag.id} padding="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm text-ink">{lag.navn}</h3>
                  {lag.resultat && (
                    <span className="font-scoreboard text-sm text-ink-soft">
                      {lag.resultat.plassering
                        ? `${lag.resultat.plassering}. plass · `
                        : ""}
                      {lag.resultat.poeng} p
                    </span>
                  )}
                </div>

                <ul className="mt-3 flex flex-wrap gap-2">
                  {lag.medlemmer.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-1.5 border-2 border-ink/20 bg-paper-soft px-3 py-1 text-sm"
                    >
                      {m.user.navn}
                      {erVert && (
                        <form action={fjernMedlemAction}>
                          <input type="hidden" name="lagmedlemId" value={m.id} />
                          <button
                            type="submit"
                            className="text-ink-soft transition-colors hover:text-coral-dark"
                            aria-label={`Fjern ${m.user.navn} fra laget`}
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                  {lag.medlemmer.length === 0 && (
                    <li className="text-sm text-ink-soft/70">
                      Ingen medlemmer ennå
                    </li>
                  )}
                </ul>

                {erVert && (
                  <div className="mt-4 flex flex-col gap-3 border-t-2 border-ink/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <form action={leggTilMedlemAction} className="flex items-end gap-2">
                      <div>
                        <Label htmlFor={`userId-${lag.id}`}>Legg til medlem</Label>
                        <Select id={`userId-${lag.id}`} name="userId" required>
                          {tilgjengelige.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.navn}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button type="submit" variant="outline">
                        Legg til
                      </Button>
                    </form>

                    <form action={lagreResultatAction} className="flex items-end gap-2">
                      <div className="w-20">
                        <Label htmlFor={`plassering-${lag.id}`}>Plass.</Label>
                        <Input
                          id={`plassering-${lag.id}`}
                          type="number"
                          name="plassering"
                          min={1}
                          defaultValue={lag.resultat?.plassering ?? undefined}
                        />
                      </div>
                      <div className="w-24">
                        <Label htmlFor={`poeng-${lag.id}`}>Poeng</Label>
                        <Input
                          id={`poeng-${lag.id}`}
                          type="number"
                          name="poeng"
                          step="0.5"
                          required
                          defaultValue={lag.resultat?.poeng ?? undefined}
                        />
                      </div>
                      <Button type="submit">Lagre</Button>
                    </form>
                  </div>
                )}
              </Card>
            );
          })}

          {ovelse.lag.length === 0 && (
            <p className="text-sm text-ink-soft">Ingen lag er opprettet ennå.</p>
          )}
        </div>
      )}
    </div>
  );
}
