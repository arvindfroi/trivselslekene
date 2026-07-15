import Link from "next/link";
import { ArrowRight, PartyPopper, Trophy } from "lucide-react";

/**
 * Inngangen til finaleshowet — behandles som et *øyeblikk*, ikke et fast
 * menypunkt. To former:
 *  - "hero": alltid synlig på Statistikk-siden (resultat-hubben), men
 *    eskalerer i tekst og glød etter hvert som sesongen nærmer seg slutt.
 *  - "banner": dukker bare opp på Dashboard NÅR sesongen er ferdig, så
 *    folk fanges i akkurat det øyeblikket showet blir relevant.
 */
export default function FinaleInngang({
  antallFullfort,
  antallOvelser,
  variant = "hero",
}: {
  antallFullfort: number;
  antallOvelser: number;
  variant?: "hero" | "banner";
}) {
  const harData = antallFullfort > 0;
  const ferdig = antallOvelser > 0 && antallFullfort >= antallOvelser;
  const naerFerdig = antallOvelser > 0 && antallFullfort / antallOvelser >= 0.75;

  // Banneret er et sesongslutt-varsel — vis det bare når alt er spilt
  if (variant === "banner" && !ferdig) return null;

  const overskrift = ferdig
    ? "Sesongen er over — tid for finaleshowet!"
    : naerFerdig
      ? "Snart i mål — finaleshowet venter"
      : "Finaleshowet";

  const undertekst = ferdig
    ? "Alle lekene er spilt. Koble PC-en til TV-en, samle gjengen og kjør den store oppsummeringen."
    : naerFerdig
      ? `${antallFullfort} av ${antallOvelser} leker er ferdige. Ta en forhåndstitt, eller vent til siste lek er spilt.`
      : harData
        ? "Den store, animerte oppsummeringen av lekene — historien, prisene og kåringen av vinneren."
        : "Her kommer den store finalen når de første resultatene er registrert.";

  // ─── Banner (Dashboard) ────────────────────────────────────────
  if (variant === "banner") {
    return (
      <Link
        href="/finale"
        className="group surface relative block overflow-hidden rounded-2xl border-[var(--gold)]/30 p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
      >
        <div
          aria-hidden
          className="animate-gradient-drift pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(100deg, var(--accent) 0%, var(--accent-2) 40%, var(--accent-3) 70%, var(--gold) 100%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <span className="bg-icon-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white">
            <Trophy size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg text-fg">{overskrift}</p>
            <p className="mt-0.5 truncate text-sm text-fg-dim">{undertekst}</p>
          </div>
          <span className="hidden items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_36px_-10px_rgba(22,184,35,0.65)] transition-transform group-hover:scale-[1.03] sm:inline-flex">
            Start showet
            <ArrowRight size={16} />
          </span>
          <ArrowRight size={20} className="shrink-0 text-fg-dim sm:hidden" />
        </div>
      </Link>
    );
  }

  // ─── Hero (Statistikk) ─────────────────────────────────────────
  const fremhevet = ferdig || naerFerdig;
  return (
    <Link
      href="/finale"
      className="group surface relative block overflow-hidden rounded-2xl p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
      style={fremhevet ? { borderColor: "color-mix(in srgb, var(--gold) 35%, transparent)" } : undefined}
    >
      {/* Levende gradient-teaser i bakgrunnen (CSS, ikke WebGL) */}
      <div
        aria-hidden
        className={`animate-gradient-drift pointer-events-none absolute inset-0 ${fremhevet ? "opacity-25" : "opacity-[0.14]"}`}
        style={{
          backgroundImage:
            "linear-gradient(100deg, var(--accent) 0%, var(--accent-2) 45%, var(--accent-3) 70%, var(--gold) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 85% 50%, color-mix(in srgb, var(--accent-3) 22%, transparent), transparent)",
        }}
      />

      <div className="relative flex items-center gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${
            fremhevet ? "" : "bg-icon-badge"
          }`}
          style={
            fremhevet
              ? { background: "conic-gradient(from 0deg, var(--gold), var(--accent-2), var(--accent-3), var(--gold))" }
              : undefined
          }
        >
          <PartyPopper size={26} />
        </span>

        <div className="min-w-0 flex-1">
          {fremhevet && (
            <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--gold)] uppercase">
              {ferdig ? "Klar til å kjøres" : "Nesten klar"}
            </p>
          )}
          <p className="font-display text-xl text-fg sm:text-2xl">{overskrift}</p>
          <p className="mt-1 text-sm text-fg-dim">{undertekst}</p>
        </div>

        <span className="hidden items-center gap-2 self-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_36px_-10px_rgba(22,184,35,0.65)] transition-transform group-hover:scale-[1.03] sm:inline-flex">
          <PartyPopper size={16} />
          Start showet
        </span>
        <ArrowRight size={20} className="shrink-0 self-center text-fg-dim sm:hidden" />
      </div>
    </Link>
  );
}
