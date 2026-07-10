import { cn } from "@/lib/utils";

function initialer(navn: string): string {
  const deler = navn.trim().split(/\s+/);
  const forste = deler[0]?.[0] ?? "";
  const siste = deler.length > 1 ? deler[deler.length - 1][0] : "";
  return (forste + siste).toUpperCase() || "?";
}

/** Rundt profilbilde med initial-fallback når det ikke finnes et bilde.
 *  Bruker `farge` som bakgrunnsfarge hvis oppgitt, ellers signaturgradient. */
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
        !bildeUrl && !farge && "bg-gradient-accent",
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
