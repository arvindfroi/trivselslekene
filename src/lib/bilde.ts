/**
 * Gjør om base64-blobber fra databasen til små, cachebare URL-er mot
 * /api/bilde/... slik at side-payloaden (RSC) holder seg liten. Uten dette
 * inlines hvert bilde (100–500 kB) i HTML-en på nytt ved hver eneste
 * revalidering — det er hovedgrunnen til at knappetrykk føles trege.
 *
 * `v`-parameteren er en billig innholds-hash, så CDN/browser kan cache
 * bildet evig og likevel hente nytt når innholdet faktisk endres.
 */

export type MedBilde = { id: string; bildeUrl: string | null };

const bildeUrlCache = new Map<string, string | null>();

function fingeravtrykk(s: string): string {
  // djb2-variant som sampler strengen — rask nok for 500 kB base64,
  // og kollisjoner er uansett bare et cache-spørsmål.
  let h = 5381;
  const steg = Math.max(1, Math.floor(s.length / 512));
  for (let i = 0; i < s.length; i += steg) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36) + "-" + s.length.toString(36);
}

export function bildeUrlFor(
  type: "bruker" | "ovelse" | "fase",
  rad: MedBilde,
): string | null {
  const cacheKey = `${type}:${rad.id}`;
  const cached = bildeUrlCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let result: string | null = null;
  if (!rad.bildeUrl) result = null;
  // Allerede en ekte URL (f.eks. etter migrering til Vercel Blob)? Bruk den.
  else if (!rad.bildeUrl.startsWith("data:")) result = rad.bildeUrl;
  else result = `/api/bilde/${type}/${rad.id}?v=${fingeravtrykk(rad.bildeUrl)}`;

  bildeUrlCache.set(cacheKey, result);
  return result;
}
