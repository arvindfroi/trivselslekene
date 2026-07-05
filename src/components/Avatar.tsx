import { cn } from "@/lib/utils";

function initialer(navn: string): string {
  const deler = navn.trim().split(/\s+/);
  const forste = deler[0]?.[0] ?? "";
  const siste = deler.length > 1 ? deler[deler.length - 1][0] : "";
  return (forste + siste).toUpperCase() || "?";
}

/** Rundt profilbilde med initial-fallback når det ikke finnes et bilde. */
export default function Avatar({
  navn,
  bildeUrl,
  size = 36,
  className,
}: {
  navn: string;
  bildeUrl?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line",
        !bildeUrl && "bg-gradient-accent font-display font-semibold text-white",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
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
