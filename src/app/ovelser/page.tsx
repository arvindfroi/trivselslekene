import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { opprettOvelse } from "@/lib/actions/ovelser";

export default async function OvelserSide() {
  const session = await auth();
  if (!session?.user) redirect("/logg-inn");

  const sesong = await sikreAktivSesong();

  const ovelser = await prisma.ovelse.findMany({
    where: { sesongId: sesong.id },
    include: { vert: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Øvelser – {sesong.navn}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Verten for en øvelse deltar ikke selv i den øvelsen, men er med i alle
        de andre.
      </p>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Opprett ny øvelse</h2>
        <form action={opprettOvelse} className="flex flex-col gap-3">
          <div>
            <label htmlFor="navn" className="mb-1 block text-sm font-medium">
              Navn på øvelsen
            </label>
            <input
              id="navn"
              name="navn"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="F.eks. Stikkball, Bridge-turnering, Sekkeløp"
            />
          </div>

          <div>
            <label
              htmlFor="beskrivelse"
              className="mb-1 block text-sm font-medium"
            >
              Beskrivelse (valgfritt)
            </label>
            <textarea
              id="beskrivelse"
              name="beskrivelse"
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <fieldset>
            <legend className="mb-1 block text-sm font-medium">Type øvelse</legend>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="INDIVIDUELL"
                  defaultChecked
                />
                Individuell – hver deltaker konkurrerer for seg selv
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="type" value="LAG" />
                Lagøvelse – deltakerne konkurrerer i lag
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="lagFormat" className="mb-1 block text-sm font-medium">
              Lagformat (kun for lagøvelser)
            </label>
            <select
              id="lagFormat"
              name="lagFormat"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              defaultValue="PAR"
            >
              <option value="PAR">Par (2 og 2)</option>
              <option value="TRIO">Trekamp (3 og 3)</option>
              <option value="FLERE_LAG">Flere lag mot hverandre</option>
            </select>
          </div>

          <button
            type="submit"
            className="mt-2 self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Opprett øvelse
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Alle øvelser</h2>
        {ovelser.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen øvelser er opprettet ennå.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ovelser.map((ovelse) => (
              <li key={ovelse.id}>
                <Link
                  href={`/ovelser/${ovelse.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-blue-400"
                >
                  <div>
                    <p className="font-medium">{ovelse.navn}</p>
                    <p className="text-xs text-gray-500">
                      Vert: {ovelse.vert.navn} ·{" "}
                      {ovelse.type === "LAG" ? "Lagøvelse" : "Individuell"}
                    </p>
                  </div>
                  <span className="text-xs uppercase text-gray-500">
                    {ovelse.status === "FULLFORT"
                      ? "Fullført"
                      : ovelse.status === "PAAGAAR"
                        ? "Pågår"
                        : "Planlagt"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
