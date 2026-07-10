import { cn } from "@/lib/utils";

function initialer(navn: string): string {
  const deler = navn.trim().split(/\s+/);
  const forste = deler[0]?.[0] ?? "";
  const siste = deler.length > 1 ? deler[deler.length - 1][0] : "";
  return (forste + siste).toUpperCase() || "?";
}

const AKSENT_BAKGRUNNER = ["bg-accent", "bg-accent-2", "bg-accent-3"];

/** Velger én av de tre aksentfargene deterministisk basert på navnet,
 *  slik at samme person alltid får samme farge i stedet for at den
 *  bytter ved hver re-rendring. */
function tilfeldigAksentBakgrunn(navn: string): string {
  let hash = 0;
  for (let i = 0; i < navn.length; i++) {
    hash = (Math.imul(31, hash) + navn.charCodeAt(i)) | 0;
  }
  return AKSENT_BAKGRUNNER[Math.abs(hash) % AKSENT_BAKGRUNNER.length];
}

/** Rundt profilbilde med initial-fallback når det ikke finnes et bilde.
 *  Bruker `farge` som bakgrunnsfarge hvis oppgitt, ellers én av de tre
 *  aksentfargene, valgt deterministisk ut fra navnet. */
export default function Avatar({
  navn,
  bildeUrl,
  farge,
  size = 36,
  className,
}: {
  navn: string;
  bildeUrl?: string | null;
  farge?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line",
        !bildeUrl && "font-display font-semibold text-white",
        !bildeUrl && !farge && tilfeldigAksentBakgrunn(navn),
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        ...(farge && !bildeUrl ? { backgroundColor: farge } : {}),
      }}
    >
      {bildeUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bildeUrl}
          alt={navn}
          className="h-full w-full object-cover"
        />
      ) : (
        initialer(navn)
      )}
    </span>
  );
}
