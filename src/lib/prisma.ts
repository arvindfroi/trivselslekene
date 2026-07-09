import { PrismaClient } from "@prisma/client";

/**
 * Miljøvariabler kan ikke endres uten dashboard-tilgang, så pooled
 * tilkobling (PgBouncer) håndteres her i stedet: Neon-hosten skrives om
 * til `-pooler`-endepunktet ved oppstart. Samme credentials, samme
 * database — men serverless-funksjoner slutter å kjempe om direkte
 * tilkoblinger. Er URL-en allerede pooled (eller ikke Neon) skjer ingenting.
 */
function pooledDatabaseUrl(): string | undefined {
  const raa = process.env.DATABASE_URL;
  if (!raa) return undefined;
  try {
    const url = new URL(raa);
    if (
      url.hostname.endsWith(".neon.tech") &&
      !url.hostname.includes("-pooler")
    ) {
      const [forste, ...rest] = url.hostname.split(".");
      url.hostname = [`${forste}-pooler`, ...rest].join(".");
      url.searchParams.set("pgbouncer", "true");
      return url.toString();
    }
    return raa;
  } catch {
    return raa;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: pooledDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
