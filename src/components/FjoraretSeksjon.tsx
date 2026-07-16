"use client";

import { Crown } from "lucide-react";
import Avatar from "@/components/Avatar";
import Card from "@/components/ui/Card";
import KollapsSeksjon from "@/components/KollapsSeksjon";
import {
  FJORARET_DELTAKERE,
  FJORARET_LEKER,
  FJORARET_SPILTE_LEKER,
  fjoraretStilling,
} from "@/lib/fjoraaret";

/** Lysner deltakerfargen (mørk, laget for hvit tekst) til bruk på streker/barer. */
function lysFarge(farge: string): string {
  return `color-mix(in srgb, ${farge} 55%, white)`;
}

const MEDALJER = ["🥇", "🥈", "🥉"];

/**
 * Fjorårets Trivselslekene i statistikk-tabben. Fjoråret hadde ingen
 * egenskaper på lekene og ingen egne leknavn — bare hvem som arrangerte dem —
 * så dette er en enklere, frittstående visning enn årets bento-mosaikk:
 * en pall, sammenlagtlista og en utfellbar resultattavle.
 */
export default function FjoraretSeksjon() {
  const stilling = fjoraretStilling();
  const topp = stilling.slice(0, 3);
  const maksPoeng = Math.max(1, stilling[0]?.totalPoeng ?? 1);
  const forsprang =
    stilling.length >= 2 ? stilling[0].totalPoeng - stilling[1].totalPoeng : 0;

  // Podiumrekkefølge: 2. plass til venstre, 1. i midten, 3. til høyre.
  const pallOppsett = [topp[1], topp[0], topp[2]].filter(Boolean);

  // Toppscore per lek — så vinneren av hver lek kan uthevés i tavla.
  const toppPerLek = FJORARET_LEKER.map((lek) => {
    const verdier = Object.values(lek.poeng);
    return verdier.length ? Math.max(...verdier) : null;
  });

  return (
    <div>
      <p className="text-sm text-fg-dim">
        Slik endte den aller første utgaven. Fjoråret hadde ingen egenskaper på
        lekene, og lekene hadde ingen egne navn — vi vet bare hvem som arrangerte
        («hosta») hver av dem, så de er oppkalt etter verten.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
        <Card padding="p-4" className="text-center">
          <p className="text-[11px] tracking-widest text-fg-faint uppercase">Deltakere</p>
          <p className="mt-1 font-display text-2xl text-fg tabular-nums">
            {FJORARET_DELTAKERE.length}
          </p>
        </Card>
        <Card padding="p-4" className="text-center">
          <p className="text-[11px] tracking-widest text-fg-faint uppercase">Leker</p>
          <p className="mt-1 font-display text-2xl text-fg tabular-nums">
            {FJORARET_SPILTE_LEKER.length}
          </p>
        </Card>
        <Card padding="p-4" className="text-center">
          <p className="text-[11px] tracking-widest text-fg-faint uppercase">Mester</p>
          <p className="mt-1 font-display text-2xl text-fg">{topp[0]?.navn ?? "–"}</p>
        </Card>
      </div>

      {/* ─── Pallen ─────────────────────────────────────────────── */}
      <div className="mt-7 flex items-end justify-center gap-3 sm:gap-5">
        {pallOppsett.map((rad) => {
          const gull = rad.plass === 1;
          const hoyde = gull ? 116 : rad.plass === 2 ? 88 : 68;
          const lys = lysFarge(rad.farge);
          return (
            <div key={rad.navn} className="flex w-24 flex-col items-center sm:w-28">
              <span className="text-xl" aria-hidden>
                {MEDALJER[rad.plass - 1]}
              </span>
              <Avatar
                navn={rad.navn}
                farge={rad.farge}
                size={gull ? 64 : 50}
                className={gull ? "ring-2 ring-[var(--gold)]" : ""}
              />
              <p className="mt-1.5 font-display text-base text-fg">{rad.navn}</p>
              <div
                className="mt-2 flex w-full items-start justify-center rounded-t-xl pt-2"
                style={{
                  height: hoyde,
                  background: gull
                    ? "linear-gradient(180deg, color-mix(in srgb, var(--gold) 85%, white), color-mix(in srgb, var(--gold) 65%, black))"
                    : `linear-gradient(180deg, color-mix(in srgb, ${lys} 78%, white), color-mix(in srgb, ${lys} 60%, black))`,
                  boxShadow: `inset 0 2px 0 rgba(255,255,255,0.4), 0 12px 34px -14px ${gull ? "var(--gold)" : lys}`,
                }}
              >
                <span className="font-display text-xl font-bold text-black/70 tabular-nums">
                  {rad.totalPoeng}p
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {forsprang <= 2 && topp.length >= 2 && (
        <p className="mt-4 text-center text-xs text-fg-dim">
          {forsprang === 0
            ? `Dødt løp på toppen — ${topp[0].navn} og ${topp[1].navn} delte førsteplassen!`
            : `En thriller helt inn: bare ${forsprang} poeng skilte ${topp[0].navn} og ${topp[1].navn}.`}
        </p>
      )}

      {/* ─── Sammenlagt ─────────────────────────────────────────── */}
      <Card padding="p-0" className="mt-7 overflow-hidden">
        <ul className="divide-y divide-line">
          {stilling.map((rad) => {
            const pct = Math.max(6, (rad.totalPoeng / maksPoeng) * 100);
            const gull = rad.plass === 1;
            return (
              <li
                key={rad.navn}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  gull ? "bg-[color-mix(in_srgb,var(--gold)_8%,transparent)]" : ""
                }`}
              >
                <span className="w-6 shrink-0 text-right text-sm text-fg-faint tabular-nums">
                  {gull ? <Crown size={16} className="ml-auto text-[var(--gold)]" /> : `${rad.plass}.`}
                </span>
                <Avatar navn={rad.navn} farge={rad.farge} size={30} />
                <span className="w-16 shrink-0 truncate text-sm font-medium text-fg sm:w-20">
                  {rad.navn}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: lysFarge(rad.farge) }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-sm font-semibold text-fg tabular-nums">
                  {rad.totalPoeng}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ─── Full resultattavle ─────────────────────────────────── */}
      <div className="mt-6">
        <KollapsSeksjon tittel="Full resultattavle">
          <Card padding="p-0" className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-fg-dim">
                  <th className="sticky left-0 z-10 bg-bg-elev px-3 py-2.5 text-left font-medium whitespace-nowrap">
                    Lek
                  </th>
                  {FJORARET_DELTAKERE.map((navn) => (
                    <th
                      key={navn}
                      className="px-2 py-2.5 text-center text-xs font-medium whitespace-nowrap"
                    >
                      {navn}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FJORARET_LEKER.map((lek, i) => (
                  <tr key={lek.navn} className="border-b border-line/50 last:border-0">
                    <td className="sticky left-0 z-10 bg-bg-elev px-3 py-2 text-left whitespace-nowrap">
                      <span className="font-medium text-fg">{lek.navn}</span>
                      {lek.vert ? (
                        <span className="ml-1.5 text-[11px] text-fg-faint">· {lek.vert}</span>
                      ) : (
                        <span className="ml-1.5 text-[11px] text-fg-faint">· maskin</span>
                      )}
                      {!lek.gjennomfort && (
                        <span className="ml-1.5 text-[11px] text-fg-faint italic">
                          (ikke spilt)
                        </span>
                      )}
                    </td>
                    {FJORARET_DELTAKERE.map((navn) => {
                      const erVert = lek.vert === navn;
                      const p = lek.poeng[navn];
                      const beste = toppPerLek[i] !== null && p === toppPerLek[i] && p !== undefined;
                      return (
                        <td
                          key={navn}
                          className={`px-2 py-2 text-center tabular-nums ${
                            erVert
                              ? "text-fg-faint"
                              : beste
                                ? "font-semibold text-[var(--gold)]"
                                : p !== undefined
                                  ? "text-fg"
                                  : "text-fg-faint"
                          }`}
                        >
                          {erVert ? "vert" : p !== undefined ? p : "–"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-line">
                  <td className="sticky left-0 z-10 bg-bg-elev px-3 py-2.5 text-left font-semibold text-fg">
                    Sammenlagt
                  </td>
                  {FJORARET_DELTAKERE.map((navn) => {
                    const rad = stilling.find((r) => r.navn === navn);
                    return (
                      <td
                        key={navn}
                        className="px-2 py-2.5 text-center font-semibold text-fg tabular-nums"
                      >
                        {rad?.totalPoeng ?? 0}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </Card>
          <p className="mt-3 text-xs text-fg-faint">
            Gull = beste poengsum i leken. «vert» = arrangerte leken og deltok ikke
            selv. «Marble lek» var et maskinstyrt marmorrace uten vert, og «Emils
            lek» ble aldri gjennomført.
          </p>
        </KollapsSeksjon>
      </div>
    </div>
  );
}
