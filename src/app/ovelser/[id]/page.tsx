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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ovelse.navn}</h1>
          <p className="text-sm text-gray-600">
            Vert: {ovelse.vert.navn} · {ovelse.sesong.navn}
          </p>
          {ovelse.beskrivelse && (
            <p className="mt-2 max-w-xl text-sm text-gray-700">
              {ovelse.beskrivelse}
            </p>
          )}
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase text-gray-600">
          {statusTekst[ovelse.status]}
        </span>
      </div>

      {erVert && (
        <form action={endreStatus} className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-gray-500">Status:</span>
          {(["PLANLAGT", "PAAGAAR", "FULLFORT"] as OvelseStatus[]).map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              className={`rounded-md border px-3 py-1 ${
                ovelse.status === s
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {statusTekst[s]}
            </button>
          ))}
        </form>
      )}

      {!erVert && (
        <p className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          Kun verten ({ovelse.vert.navn}) kan registrere resultater og endre
          status for denne øvelsen.
        </p>
      )}

      {ovelse.type === "INDIVIDUELL" ? (
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Resultater</h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">Plassering</th>
                <th className="py-2">Deltaker</th>
                <th className="py-2 text-right">Poeng</th>
              </tr>
            </thead>
            <tbody>
              {ovelse.individuelleResultater.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2">{r.plassering ?? "–"}</td>
                  <td className="py-2">{r.user.navn}</td>
                  <td className="py-2 text-right">{r.poeng}</td>
                </tr>
              ))}
              {ovelse.individuelleResultater.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">
                    Ingen resultater registrert ennå
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {erVert && (
            <form
              action={lagreIndividueltAction}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4"
            >
              <div>
                <label className="mb-1 block text-xs font-medium">Deltaker</label>
                <select
                  name="userId"
                  required
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {deltakere.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.navn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Plassering</label>
                <input
                  type="number"
                  name="plassering"
                  min={1}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Poeng</label>
                <input
                  type="number"
                  name="poeng"
                  step="0.5"
                  required
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Lagre resultat
              </button>
            </form>
          )}
        </section>
      ) : (
        <section className="mt-6 flex flex-col gap-4">
          {erVert && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-3 font-semibold">Opprett lag</h2>
              <form action={opprettLagAction} className="flex gap-2">
                <input
                  name="navn"
                  required
                  placeholder="Lagnavn"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Legg til lag
                </button>
              </form>
            </div>
          )}

          {ovelse.lag.map((lag) => {
            const lagId = lag.id;
            async function leggTilMedlemAction(formData: FormData) {
              "use server";
              await leggTilLagmedlem(ovelseId, lagId, formData);
            }
            async function fjernMedlemAction(formData: FormData) {
              "use server";
              const lagmedlemId = String(formData.get("lagmedlemId") ?? "");
              if (lagmedlemId) await fjernLagmedlem(ovelseId, lagmedlemId);
            }
            async function lagreResultatAction(formData: FormData) {
              "use server";
              await lagreResultatLag(ovelseId, lagId, formData);
            }

            const medlemIder = new Set(lag.medlemmer.map((m) => m.userId));
            const tilgjengelige = deltakere.filter((d) => !medlemIder.has(d.id));

            return (
              <div key={lag.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{lag.navn}</h3>
                  {lag.resultat && (
                    <span className="text-sm text-gray-600">
                      {lag.resultat.plassering ? `${lag.resultat.plassering}. plass · ` : ""}
                      {lag.resultat.poeng} poeng
                    </span>
                  )}
                </div>

                <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                  {lag.medlemmer.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1"
                    >
                      {m.user.navn}
                      {erVert && (
                        <form action={fjernMedlemAction}>
                          <input type="hidden" name="lagmedlemId" value={m.id} />
                          <button
                            type="submit"
                            className="ml-1 text-gray-400 hover:text-red-600"
                            aria-label={`Fjern ${m.user.navn} fra laget`}
                          >
                            ×
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                  {lag.medlemmer.length === 0 && (
                    <li className="text-gray-400">Ingen medlemmer ennå</li>
                  )}
                </ul>

                {erVert && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-end sm:justify-between">
                    <form action={leggTilMedlemAction} className="flex items-end gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium">
                          Legg til medlem
                        </label>
                        <select
                          name="userId"
                          required
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                        >
                          {tilgjengelige.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.navn}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                      >
                        Legg til
                      </button>
                    </form>

                    <form action={lagreResultatAction} className="flex items-end gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium">
                          Plassering
                        </label>
                        <input
                          type="number"
                          name="plassering"
                          min={1}
                          defaultValue={lag.resultat?.plassering ?? undefined}
                          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Poeng</label>
                        <input
                          type="number"
                          name="poeng"
                          step="0.5"
                          required
                          defaultValue={lag.resultat?.poeng ?? undefined}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Lagre resultat
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}

          {ovelse.lag.length === 0 && (
            <p className="text-sm text-gray-500">Ingen lag er opprettet ennå.</p>
          )}
        </section>
      )}
    </div>
  );
}
