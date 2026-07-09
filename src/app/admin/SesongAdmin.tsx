import { prisma } from "@/lib/prisma";
import { opprettSesong, settAktivSesong } from "@/lib/actions/admin";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function SesongAdmin() {
  const sesonger = await prisma.sesong.findMany({ orderBy: { aar: "desc" } });

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
        Sesonger
      </h2>

      <form action={opprettSesong} className="mb-4 flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="aar" className="text-xs text-fg-dim">
            År
          </label>
          <input
            id="aar"
            name="aar"
            type="number"
            min={2020}
            max={2100}
            placeholder="2026"
            className="w-28 rounded-lg border border-line bg-white/[0.04] px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent-2 focus:outline-none"
          />
        </div>
        <SubmitButton>Opprett</SubmitButton>
      </form>

      <div className="surface rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-fg-dim uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Navn</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sesonger.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-fg">{s.navn}</td>
                <td className="px-4 py-3">
                  {s.aktiv ? (
                    <span className="text-accent-3 font-medium">Aktiv</span>
                  ) : (
                    <span className="text-fg-dim">Inaktiv</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!s.aktiv && (
                    <form action={settAktivSesong}>
                      <input type="hidden" name="sesongId" value={s.id} />
                      <SubmitButton
                        variant="secondary"
                        className="px-3 py-1.5 text-xs"
                      >
                        Aktiver
                      </SubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
