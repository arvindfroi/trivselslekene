import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fjernLagmedlem,
  lagreResultatLag,
  leggTilLagmedlem,
  opprettLag,
  settOvelseStatus,
  slettOvelse,
  beregnAutoPlassering,
} from "@/lib/actions/ovelser";
import type { OvelseStatus } from "@prisma/client";
import { lagFormatTekst, statusTekst, statusVariant } from "@/lib/ovelseLabels";
import { bildeUrlFor } from "@/lib/bilde";
import { erAvslort, visLekNavn } from "@/lib/avsloring";
import KvalitetChip from "@/components/KvalitetChip";
import FaseNavigator from "@/components/FaseNavigator";
import ElimineringsPanel from "@/components/ElimineringsPanel";
import LiveRefresh from "@/components/LiveRefresh";
import RankingRedigering from "@/components/RankingRedigering";
import LagResultatAutoLagre from "@/components/LagResultatAutoLagre";
import Card from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import { MapPin, Users, X, Trash2, Monitor, Plus, UserRoundX } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/Field";
import { opprettTestdeltakere, slettTestdeltakere } from "@/lib/actions/testdeltakere";

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
          userId: true,
          plassering: true,
          poeng: true,
          bonusPoeng: true,
          utgattFase: true,
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
  const laast = ovelse.status === "FULLFORT";
  // Leknavnet holdes skjult for andre enn verten frem til avsløringstidspunktet.
  const visNavn = visLekNavn(ovelse.navn, erVert, erAvslort());

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
    // Ved FULLFORT: beregn automatisk plassering basert på elimineringsrekkefølge
    if (status === "FULLFORT") {
      await beregnAutoPlassering(ovelseId);
    }
  }

  async function opprettLagAction(formData: FormData) {
    "use server";
    await opprettLag(ovelseId, formData);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-28">
      {/* Alle følger fasebytter, nye deltakere og resultater live — klient-
          komponentene beholder sin lokale state gjennom refresh, så vertens
          redigering forstyrres ikke. */}
      <LiveRefresh aktiv />
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
          <h1 className="mt-1 font-display text-3xl text-fg">{visNavn}</h1>
          <p className="mt-1 text-sm text-fg-dim">
            {ovelse.type === "LAG"
              ? `Laglek${
                  ovelse.lagFormat ? ` · ${lagFormatTekst[ovelse.lagFormat]}` : ""
                }`
              : "Individuell lek"}
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
              status={ovelse.status}
              fallbackBilde={ovelseBilde}
            />
          )}

          {/* ─── Elimineringspanel (kun for vert under PAAGAAR med faser) ─── */}
          {ovelse.type === "INDIVIDUELL" && (
            <ElimineringsPanel
              ovelseId={ovelseId}
              deltakere={ovelse.individuelleResultater.map((r) => ({
                userId: r.userId,
                navn: r.user.navn,
                utgattFase: r.utgattFase ?? null,
              }))}
              aktivFase={ovelse.aktivFase}
              erVert={erVert}
              status={ovelse.status}
              harFaser={harFaser}
            />
          )}

          {/* Fallback — enkeltbilde for leker uten faser */}
          {!harFaser && ovelseBilde && (
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ovelseBilde}
                alt={`Kart for ${visNavn}`}
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
            className="inline-flex gap-0 overflow-hidden rounded-full border border-line-strong"
          >
            {(["PLANLAGT", "PAAGAAR", "FULLFORT"] as OvelseStatus[]).map(
              (s, i) => (
                <button
                  key={s}
                  type="submit"
                  name="status"
                  value={s}
                  className={`min-h-[44px] px-4 py-3 text-xs font-medium tracking-wide uppercase transition-colors ${
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
            <SubmitButton variant="danger" className="px-3 py-2 text-xs" pendingText="Sletter…">
              <Trash2 size={14} /> Slett lek
            </SubmitButton>
          </form>
          <LinkButton
            href={`/ovelser/${ovelseId}/live`}
            variant="secondary"
            className="px-3 py-2 text-xs"
          >
            <Monitor size={14} /> Storskjerm
          </LinkButton>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-line bg-white/[0.03] px-4 py-2.5 text-sm text-fg-dim">
          Kun verten ({ovelse.vert.navn}) kan registrere resultater og endre
          status for denne leken.
        </p>
      )}

      {ovelse.type === "INDIVIDUELL" ? (
        erVert ? (
          <Card className="mt-8" padding="p-5 sm:p-6">
            <RankingRedigering
              ovelseId={ovelseId}
              status={ovelse.status}
              eksisterende={ovelse.individuelleResultater}
              alleDeltakere={deltakere}
            />
          </Card>
        ) : (
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
                    <span className={`text-sm ${r.utgattFase ? "text-fg-faint line-through" : "text-fg"}`}>
                      <span className="mr-2 tabular-nums text-fg-faint">
                        {r.plassering ? `${r.plassering}.` : "–"}
                      </span>
                      {r.user.navn}
                      {r.utgattFase && (
                        <span className="ml-1.5 text-xs text-fg-faint">
                          (ut i fase {r.utgattFase})
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-sm tabular-nums">
                      <span className="text-fg">{r.poeng} p</span>
                      {r.bonusPoeng > 0 && (
                        <span className="text-xs text-accent-2">
                          (+{r.bonusPoeng})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          {laast && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
              Denne leken er fullført — resultatene er låst.
            </p>
          )}
          {erVert && !laast && (
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
                      {erVert && !laast && (
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

                {erVert && !laast && (
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

                    <LagResultatAutoLagre
                      lagId={lag.id}
                      plassering={lag.resultat?.plassering ?? null}
                      poeng={lag.resultat?.poeng ?? null}
                      lagre={lagreResultatAction}
                    />
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

      {/* ─── Testdeltakere D1–D9: små runde knapper nederst ─── */}
      <div className="fixed bottom-6 right-6 z-40 flex gap-2">
        <form action={opprettTestdeltakere}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-green-500/40 bg-green-600/20 text-green-400 shadow-lg backdrop-blur transition-all hover:bg-green-600/40 hover:text-green-300 hover:shadow-green-500/20"
            aria-label="Opprett D1–D9 testdeltakere"
            title="Opprett D1–D9"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </form>
        <form action={slettTestdeltakere}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-red-500/40 bg-red-600/20 text-red-400 shadow-lg backdrop-blur transition-all hover:bg-red-600/40 hover:text-red-300 hover:shadow-red-500/20"
            aria-label="Slett D1–D9 testdeltakere"
            title="Slett D1–D9"
          >
            <UserRoundX size={16} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
