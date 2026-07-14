import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { bildeUrlFor } from "@/lib/bilde";
import { slettTurnering } from "@/lib/actions/turnering";
import Card from "@/components/ui/Card";
import SubmitButton from "@/components/ui/SubmitButton";
import Badge from "@/components/ui/Badge";
import TurneringsBracket, { type TurneringMedData } from "@/components/TurneringsBracket";
import Avatar from "@/components/Avatar";
import { Trophy, Trash2 } from "lucide-react";
import LiveRefresh from "@/components/LiveRefresh";

const statusBadge: Record<string, "planlagt" | "pagaar" | "fullfort"> = {
  PLANLAGT: "planlagt",
  PAAGAAR: "pagaar",
  FULLFORT: "fullfort",
};

const statusTekst: Record<string, string> = {
  PLANLAGT: "Planlagt",
  PAAGAAR: "Pågår",
  FULLFORT: "Fullført",
};

export default async function TurneringSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const turneringer = await prisma.turnering.findMany({
    where: { sesongId: sesong.id },
    include: {
      deltagere: {
        include: { user: { select: { id: true, navn: true, bildeUrl: true } } },
        orderBy: { seed: "asc" },
      },
      kamper: {
        include: {
          deltager1: {
            include: { user: { select: { id: true, navn: true, bildeUrl: true } } },
          },
          deltager2: {
            include: { user: { select: { id: true, navn: true, bildeUrl: true } } },
          },
        },
        orderBy: [{ bracket: "asc" }, { runde: "asc" }, { posisjon: "asc" }],
      },
      ovelse: {
        select: {
          id: true,
          individuelleResultater: {
            include: { user: { select: { id: true, navn: true, bildeUrl: true } } },
            orderBy: { plassering: "asc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Send små bilde-URL-er til klienten i stedet for base64-blobber.
  const lettBruker = <B extends { id: string; navn: string; bildeUrl: string | null }>(u: B) => ({
    ...u,
    bildeUrl: bildeUrlFor("bruker", u),
  });
  const turneringerMedLetteBilder = turneringer.map((t) => ({
    ...t,
    deltagere: t.deltagere.map((d) => ({ ...d, user: lettBruker(d.user) })),
    kamper: t.kamper.map((k) => ({
      ...k,
      deltager1: k.deltager1 ? { ...k.deltager1, user: lettBruker(k.deltager1.user) } : k.deltager1,
      deltager2: k.deltager2 ? { ...k.deltager2, user: lettBruker(k.deltager2.user) } : k.deltager2,
    })),
    ovelse: t.ovelse ? {
      ...t.ovelse,
      individuelleResultater: t.ovelse.individuelleResultater.map((r) => ({
        ...r,
        user: lettBruker(r.user),
      })),
    } : null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-28">
        <LiveRefresh aktiv />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
              {sesong.navn}
            </p>
            <h1 className="mt-1 font-display text-4xl text-fg">Turnering</h1>
            <p className="mt-2 max-w-xl text-sm text-fg-dim">
              Dobbel-eliminering med winners og losers bracket — 8 deltagere.
            </p>
          </div>
        </div>

        {/* Turneringer */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
            Turneringer
          </h2>

          {turneringerMedLetteBilder.length === 0 ? (
            <p className="text-sm text-fg-dim">
              Ingen turneringer er opprettet ennå. Gå til{" "}
              <a href="/profil?ny=1#ny-ovelse" className="text-accent-2 underline">Profil</a> for
              å opprette en.
            </p>
          ) : (
            <div className="flex flex-col gap-10">
              {turneringerMedLetteBilder.map((t) => (
                <Card key={t.id} padding="p-5 sm:p-6">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy size={18} className="text-accent-2" />
                        <h3 className="font-display text-xl text-fg">{t.navn}</h3>
                        <Badge
                          variant={statusBadge[t.status] ?? "planlagt"}
                          pulse={t.status === "PAAGAAR"}
                        >
                          {statusTekst[t.status] ?? t.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-fg-faint">
                        {t.deltagere.length} deltagere — dobbel-eliminering
                      </p>
                    </div>

                    {t.status !== "FULLFORT" && (
                      <form action={slettTurnering.bind(null, t.id)}>
                        <SubmitButton variant="danger" className="px-3 py-2 text-xs" pendingText="Sletter…">
                          <Trash2 size={14} /> Slett
                        </SubmitButton>
                      </form>
                    )}
                  </div>

                  {/* Deltagerliste */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {t.deltagere.map((d) => (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-line px-2.5 py-1 text-xs text-fg-dim"
                      >
                        <span className="font-mono text-fg-faint">#{d.seed}</span>
                        <span>{d.user.navn}</span>
                      </span>
                    ))}
                  </div>

                  {/* Bracket */}
                  <TurneringsBracket turnering={t as unknown as TurneringMedData} />

                  {/* Resultater (kun vist når turneringen er ferdig) */}
                  {t.status === "FULLFORT" && t.ovelse && t.ovelse.individuelleResultater.length > 0 && (
                    <div className="mt-8 border-t border-line pt-6">
                      <h4 className="mb-4 text-sm font-semibold text-fg">Resultater</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-line text-left text-xs text-fg-faint uppercase tracking-wider">
                              <th className="pb-2 w-12 font-medium">Plass</th>
                              <th className="pb-2 font-medium">Deltaker</th>
                              <th className="pb-2 w-16 text-right font-medium">Poeng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/50">
                            {t.ovelse.individuelleResultater.map((r, i) => (
                              <tr
                                key={r.id}
                                className={`${i < 3 ? "font-semibold" : ""} hover:bg-white/[0.03] transition-colors`}
                              >
                                <td className="py-2">
                                  <span
                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                      i === 0
                                        ? "bg-yellow-500/20 text-yellow-400"
                                        : i === 1
                                          ? "bg-slate-400/20 text-slate-300"
                                          : i === 2
                                            ? "bg-amber-700/20 text-amber-600"
                                            : "text-fg-faint"
                                    }`}
                                  >
                                    {r.plassering ?? i + 1}
                                  </span>
                                </td>
                                <td className="py-2">
                                  <div className="flex items-center gap-2">
                                    <Avatar
                                      navn={r.user.navn}
                                      bildeUrl={r.user.bildeUrl}
                                      size={22}
                                    />
                                    <span className="text-fg">{r.user.navn}</span>
                                  </div>
                                </td>
                                <td className="py-2 text-right">
                                  <span className="text-accent-2 tabular-nums">{r.poeng} p</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
    </div>
  );
}
