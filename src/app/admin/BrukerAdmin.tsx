import { prisma } from "@/lib/prisma";
import { bildeUrlFor } from "@/lib/bilde";
import Avatar from "@/components/Avatar";

export default async function BrukerAdmin() {
  const brukere = await prisma.user.findMany({
    select: {
      id: true,
      navn: true,
      epost: true,
      bildeUrl: true,
      farge: true,
      createdAt: true,
      _count: {
        select: { vertFor: true, individuelleResultater: true, lagmedlemskap: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
        Brukere
      </h2>

      <div className="surface rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-fg-dim uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Bruker</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">
                E-post
              </th>
              <th className="px-4 py-3 font-medium">Øvelser</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">
                Opprettet
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {brukere.map((b) => (
              <tr key={b.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      navn={b.navn}
                      bildeUrl={bildeUrlFor("bruker", {
                        id: b.id,
                        bildeUrl: b.bildeUrl,
                      })}
                      farge={b.farge}
                      size={32}
                    />
                    <span className="text-fg">{b.navn}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-fg-dim">
                  {b.epost ?? "—"}
                </td>
                <td className="px-4 py-3 text-fg-dim">
                  {b._count.individuelleResultater + b._count.lagmedlemskap}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-fg-dim">
                  {b.createdAt.toLocaleDateString("nb-NO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
