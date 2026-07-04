import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";

type Stilling = {
  userId: string;
  navn: string;
  totalPoeng: number;
  antallOvelser: number;
};

export default async function DashboardSide() {
  const session = await auth();
  if (!session?.user) redirect("/logg-inn");

  const sesong = await sikreAktivSesong();

  const brukere = await prisma.user.findMany({
    include: {
      individuelleResultater: {
        where: { ovelse: { sesongId: sesong.id } },
      },
      lagmedlemskap: {
        include: {
          lag: {
            include: { resultat: true, ovelse: true },
          },
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">{sesong.navn}</h1>
      <p className="mt-1 text-sm text-gray-600">Stilling og resultater</p>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 px-4 py-3 font-semibold">
          Sammenlagt stilling
        </h2>
        {stilling.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            Ingen resultater er registrert ennå.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Navn</th>
                <th className="px-4 py-2">Øvelser</th>
                <th className="px-4 py-2 text-right">Poeng</th>
              </tr>
            </thead>
            <tbody>
              {stilling.map((rad, i) => (
                <tr key={rad.userId} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{rad.navn}</td>
                  <td className="px-4 py-2">{rad.antallOvelser}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {rad.totalPoeng}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Øvelser</h2>
        {ovelser.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen øvelser er opprettet ennå.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {ovelser.map((ovelse) => (
              <div
                key={ovelse.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{ovelse.navn}</h3>
                  <span className="text-xs uppercase text-gray-500">
                    {ovelse.status === "FULLFORT"
                      ? "Fullført"
                      : ovelse.status === "PAAGAAR"
                        ? "Pågår"
                        : "Planlagt"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Vert: {ovelse.vert.navn}</p>

                {ovelse.type === "INDIVIDUELL" ? (
                  <ul className="mt-2 text-sm">
                    {ovelse.individuelleResultater.map((r) => (
                      <li key={r.id} className="flex justify-between">
                        <span>
                          {r.plassering ? `${r.plassering}. ` : ""}
                          {r.user.navn}
                        </span>
                        <span>{r.poeng} p</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-2 text-sm">
                    {ovelse.lag.map((lag) => (
                      <li key={lag.id} className="flex justify-between">
                        <span>
                          {lag.resultat?.plassering
                            ? `${lag.resultat.plassering}. `
                            : ""}
                          {lag.navn} (
                          {lag.medlemmer.map((m) => m.user.navn).join(", ")})
                        </span>
                        <span>{lag.resultat ? `${lag.resultat.poeng} p` : "–"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
