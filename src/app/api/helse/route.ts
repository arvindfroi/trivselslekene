import { prisma } from "@/lib/prisma";

/**
 * Diagnose uten dashboard-tilgang: viser hvilken region Vercel-funksjonen
 * kjører i, hvilken region Neon-databasen bor i (lest fra hostnavnet —
 * aldri credentials), om tilkoblingen er pooled, og målt DB-latens.
 *
 * Bruk: åpne /api/helse på den deployede appen. Hvis `vercelRegion` og
 * `neonRegion` ikke matcher, commit en vercel.json med riktig region:
 *   { "regions": ["fra1"] }   // fra1 = Frankfurt ↔ Neon aws-eu-central-1
 * (arn1 = Stockholm, iad1 = us-east-1, cle1 = us-east-2, osv.)
 */
export async function GET() {
  let neonHost = "ukjent";
  let pooled = false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    // Kun regiondelen av hostnavnet — endepunkt-ID-en droppes.
    const deler = url.hostname.split(".");
    neonHost = deler.slice(1).join(".");
    pooled =
      url.hostname.includes("-pooler") ||
      url.searchParams.get("pgbouncer") === "true";
  } catch {
    // DATABASE_URL mangler eller er ugyldig — rapporteres som "ukjent"
  }

  // Mål DB-latens: første spørring betaler ev. kaldstart/resume,
  // andre viser varm rundtur.
  const t0 = Date.now();
  let kaldMs: number | null = null;
  let varmMs: number | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    kaldMs = Date.now() - t0;
    const t1 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    varmMs = Date.now() - t1;
  } catch {
    // databasen svarer ikke — feltene forblir null
  }

  return Response.json(
    {
      vercelRegion: process.env.VERCEL_REGION ?? "ukjent (lokalt?)",
      neonRegion: neonHost,
      pooledTilkobling: pooled,
      dbFoersteSpoerring_ms: kaldMs,
      dbVarmSpoerring_ms: varmMs,
      tidspunkt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
