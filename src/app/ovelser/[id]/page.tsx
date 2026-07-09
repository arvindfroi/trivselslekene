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
  slettOvelse,
} from "@/lib/actions/ovelser";
import type { OvelseStatus } from "@prisma/client";
import { lagFormatTekst, statusTekst, statusVariant } from "@/lib/ovelseLabels";
import { bildeUrlFor } from "@/lib/bilde";
import KvalitetChip from "@/components/KvalitetChip";
import FaseNavigator from "@/components/FaseNavigator";
import LiveRefresh from "@/components/LiveRefresh";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Field";
import { MapPin, Users, X, Trash2 } from "lucide-react";

export default async function OvelseSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  // De to spørringene er uavhengige — kjør dem parallelt.
  const [ovelse, alleBrukere] = await Promise.all([
    prisma.ovelse.findUnique({
    where: { id },
    select: {
      id: true,
      navn: true,
      beskrivelse: true,
      lokasjon: true,
      type: true,
      lagFormat: true,
      kvaliteter: true,
      fellesLek: true,
      bildeUrl: true,
      status: true,
      aktivFase: true,
      vertId: true,
      sesongId: true,
      vert: { select: { id: true, navn: true } },
      sesong: { select: { navn: true } },
      faser: {
        select: { id: true, ovelseId: true, rekkefolge: true, tittel: true, bildeUrl: true },
        orderBy: { rekkefolge: "asc" },
      },
      individuelleResultater: {
        select: {
          id: true,
          plassering: true,
          poeng: true,
          user: { select: { id: true, navn: true } },
        },
        orderBy: { poeng: "desc" },
      },
      lag: {
        select: {
          id: true,
          navn: true,
          medlemmer: {
            select: { id: true, userId: true, user: { select: { id: true, navn: true } } },
          },
          resultat: { select: { plassering: true, poeng: true } },
        },
      },
    },
    }),
    prisma.user.findMany({
      select: { id: true, navn: true },
      orderBy: { navn: "asc" },
    }),
  ]);

  if (!ovelse) notFound();

  const ovelseId = ovelse.id;
  const deltakere = ovelse.fellesLek
    ? alleBrukere
    : alleBrukere.filter((b) => b.id !== ovelse.vertId);
  const erVert = session.user.id === ovelse.vertId;
  const harFaser = ovelse.faser.length > 0;

  // Bilder sendes som små URL-er (cachebare via /api/bilde) i stedet for å
  // inline base64 i payloaden — dette var hovedårsaken til trege knapper.
  const ovelseBilde = bildeUrlFor("ovelse", ovelse);
  const faserMedBilde = ovelse.faser.map((f) => ({
    id: f.id,
    rekkefolge: f.rekkefolge,
    tittel: f.tittel,
    bildeSrc: bildeUrlFor("fase", f),
  }));

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

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
      {/* Tilskuere følger fasebytter og nye resultater live mens øvelsen pågår */}
      <LiveRefresh aktiv={ovelse.status === "PAAGAAR" && !erVert} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-[0.2em] text-accent-2 uppercase">
            <span>
              {ovelse.sesong.navn} · Vert: {ovelse.vert.navn}
            </span>
            {ovelse.lokasjon && (
              <span className="inline-flex items-center gap-1 text-fg-faint normal-case tracking-normal">
                <MapPin size={12} /> {ovelse.lokasjon}
              </span>
            )}
            {ovelse.fellesLek && (
              <span className="inline-flex items-center gap-1 text-accent-3 normal-case tracking-normal">
                <Users size={12} /> Felles lek
              </span>
            )}
          </p>
          <h1 className="mt-1 font-display text-3xl text-fg">{ovelse.navn}</h1>
          <p className="mt-1 text-sm text-fg-dim">
            {ovelse.type === "LAG"
              ? `Lagøvelse${
                  ovelse.lagFormat ? ` · ${lagFormatTekst[ovelse.lagFormat]}` : ""
                }`
              : "Individuell øvelse"}
          </p>
          {ovelse.beskrivelse && (
            <p className="mt-2 max-w-xl text-sm text-fg-dim">
              {ovelse.beskrivelse}
            </p>
          )}

          {/* ─── Fase-navigator (klient, optimistisk — fasebytter er umiddelbare) ─── */}
          {harFaser && (
            <FaseNavigator
              ovelseId={ovelseId}
              faser={faserMedBilde}
              aktivFase={ovelse.aktivFase}
              erVert={erVert}
              fallbackBilde={ovelseBilde}
            />
          )}

          {/* Fallback — enkeltbilde for øvelser uten faser */}
          {!harFaser && ovelseBilde && (
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ovelseBilde}
                alt={`Kart for ${ovelse.navn}`}
                className="max-h-96 w-full object-contain bg-black/20"
              />
            </div>
          )}

          {ovelse.kvaliteter.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ovelse.kvaliteter.map((k) => (
                <KvalitetChip key={k} kvalitet={k} size="md" />
              ))}
            </div>
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
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <form
            action={endreStatus}
            className="inline-flex flex-wrap gap-0 overflow-hidden rounded-full border border-line-strong"
          >
            {(["PLANLAGT", "PAAGAAR", "FULLFORT"] as OvelseStatus[]).map(
              (s, i) => (
                <button
                  key={s}
                  type="submit"
                  name="status"
                  value={s}
                  className={`px-4 py-2 text-xs font-medium tracking-wide uppercase transition-colors ${
                    i > 0 ? "border-l border-line" : ""
                  } ${
                    ovelse.status === s
                      ? "bg-gradient-accent text-white"
                      : "text-fg-dim hover:bg-white/[0.06] hover:text-fg"
                  }`}
                >
                  {statusTekst[s]}
                </button>
              )
            )}
          </form>
          <form action={slettOvelse.bind(null, ovelseId)}>
            <Button type="submit" variant="danger" className="px-3 py-2 text-xs">
              <Trash2 size={14} /> Slett øvelse
            </Button>
          </form>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-line bg-white/[0.03] px-4 py-2.5 text-sm text-fg-dim">
          Kun verten ({ovelse.vert.navn}) kan registrere resultater og endre
          status for denne øvelsen.
        </p>
      )}

      {ovelse.type === "INDIVIDUELL" ? (
        <Card className="mt-8" padding="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-medium tracking-widest text-fg-dim uppercase">
            Resultater
          </h2>

          {ovelse.individuelleResultater.length === 0 ? (
            <p className="py-4 text-center text-sm text-fg-dim">
              Ingen resultater registrert ennå
            </p>
          ) : (
            <ul className="flex flex-col">
              {ovelse.individuelleResultater.map((r, i) => (
                <li
                  key={r.id}
                  className={`flex items-center justify-between gap-3 py-2.5 ${
                    i !== ovelse.individuelleResultater.length - 1
                      ? "border-b border-line"
                      : ""
                  }`}
                >
                  <span className="text-sm text-fg">
                    <span className="mr-2 tabular-nums text-fg-faint">
                      {r.plassering ? `${r.plassering}.` : "–"}
                    </span>
                    {r.user.navn}
                  </span>
                  <span className="text-sm tabular-nums text-fg">{r.poeng} p</span>
                </li>
              ))}
            </ul>
          )}

          {erVert && (
            <form
              action={lagreIndividueltAction}
              className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5"
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
              <SubmitButton>Lagre</SubmitButton>
            </form>
          )}
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          {erVert && (
            <Card padding="p-5 sm:p-6">
              <h2 className="mb-4 text-sm font-medium tracking-widest text-fg-dim uppercase">
                Opprett lag
              </h2>
              <form action={opprettLagAction} className="flex gap-3">
                <Input name="navn" required placeholder="Lagnavn" className="flex-1" />
                <SubmitButton>Legg til lag</SubmitButton>
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
                  <h3 className="font-display text-lg text-fg">{lag.navn}</h3>
                  {lag.resultat && (
                    <span className="text-sm tabular-nums text-fg-dim">
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
                      className="flex items-center gap-1.5 rounded-full border border-line bg-white/[0.05] px-3 py-1 text-sm text-fg"
                    >
                      {m.user.navn}
                      {erVert && (
                        <form action={fjernMedlemAction}>
                          <input type="hidden" name="lagmedlemId" value={m.id} />
                          <button
                            type="submit"
                            className="text-fg-faint transition-colors hover:text-red-300"
                            aria-label={`Fjern ${m.user.navn} fra laget`}
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                  {lag.medlemmer.length === 0 && (
                    <li className="text-sm text-fg-faint">Ingen medlemmer ennå</li>
                  )}
                </ul>

                {erVert && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
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
                      <SubmitButton variant="outline">
                        Legg til
                      </SubmitButton>
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
                      <SubmitButton>Lagre</SubmitButton>
                    </form>
                  </div>
                )}
              </Card>
            );
          })}

          {ovelse.lag.length === 0 && (
            <p className="text-sm text-fg-dim">Ingen lag er opprettet ennå.</p>
          )}
        </div>
      )}
    </div>
  );
}
