import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bildeUrlFor } from "@/lib/bilde";
import LiveRefresh from "@/components/LiveRefresh";
import { Trophy } from "lucide-react";

export default async function LiveSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ovelse = await prisma.ovelse.findUnique({
    where: { id },
    select: {
      id: true,
      navn: true,
      status: true,
      aktivFase: true,
      vert: { select: { navn: true } },
      faser: {
        select: { id: true, rekkefolge: true, tittel: true, bildeUrl: true },
        orderBy: { rekkefolge: "asc" },
      },
      individuelleResultater: {
        select: {
          plassering: true,
          poeng: true,
          user: { select: { navn: true } },
        },
        orderBy: { poeng: "desc" },
      },
      lag: {
        select: {
          navn: true,
          resultat: { select: { plassering: true, poeng: true } },
        },
        orderBy: { navn: "asc" },
      },
    },
  });

  if (!ovelse) notFound();

  const erFerdig = ovelse.status === "FULLFORT";
  const aktivFase = ovelse.aktivFase > 0
    ? ovelse.faser[ovelse.aktivFase - 1] ?? null
    : null;

  const harResultater =
    ovelse.individuelleResultater.length > 0 ||
    ovelse.lag.some((l) => l.resultat !== null);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      {/* Auto-refresh hvert 5. sekund for storskjerm */}
      <LiveRefresh aktiv={!erFerdig} intervallMs={5000} />

      <div className="flex h-dvh flex-col">
        {/* ─── Fasebilde i fullskjerm ────────────────────────────── */}
        {aktivFase && (
          <div className="relative flex-1 flex items-center justify-center bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bildeUrlFor("fase", aktivFase) ?? ""}
              alt={aktivFase.tittel ?? `Fase ${aktivFase.rekkefolge}`}
              className="max-h-full max-w-full object-contain"
            />
            {/* Fasenummer nederst */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
              <span className="rounded-full bg-black/60 px-5 py-2 text-sm font-medium text-white backdrop-blur">
                {aktivFase.tittel || `Fase ${aktivFase.rekkefolge}`}
              </span>
            </div>
          </div>
        )}

        {/* Fallback når ingen fase aktiv */}
        {!aktivFase && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-5xl text-fg-dim">
                {ovelse.navn}
              </p>
              {!erFerdig && (
                <p className="mt-4 text-sm text-fg-dim">
                  Venter på at verten starter...
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Resultater (ticker nederst) ──────────────────────── */}
        {harResultater && (
          <div className="border-t border-line/50 bg-bg-elev/80 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-4 overflow-x-auto">
              <Trophy size={20} className="shrink-0 text-accent-2" />
              {ovelse.individuelleResultater.slice(0, 8).map((r) => (
                <div key={r.user.navn} className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-fg-faint">
                    {r.plassering ? `${r.plassering}.` : "–"}
                  </span>
                  <span className="text-sm font-medium text-fg">{r.user.navn}</span>
                  <span className="text-xs tabular-nums text-accent-2">
                    {r.poeng}p
                  </span>
                </div>
              ))}
              {ovelse.lag
                .filter((l) => l.resultat)
                .map((l) => (
                  <div key={l.navn} className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-fg-faint">
                      {l.resultat!.plassering
                        ? `${l.resultat!.plassering}.`
                        : "–"}
                    </span>
                    <span className="text-sm font-medium text-fg">{l.navn}</span>
                    <span className="text-xs tabular-nums text-accent-2">
                      {l.resultat!.poeng}p
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
