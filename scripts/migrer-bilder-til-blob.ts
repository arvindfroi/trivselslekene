/**
 * Engangsmigrering: flytter alle base64-bilder (data-URL-er) fra Postgres
 * til Vercel Blob og erstatter feltverdien med den offentlige Blob-URL-en.
 *
 * Forutsetninger:
 *   1. Blob-store opprettet i Vercel (Storage → Blob → Create)
 *   2. .env inneholder DATABASE_URL og BLOB_READ_WRITE_TOKEN
 *      (hent token fra Vercel → Storage → Blob → .env.local-fanen)
 *
 * Kjør lokalt:
 *   npx tsx --env-file=.env scripts/migrer-bilder-til-blob.ts
 *
 * Skriptet er idempotent — rader som allerede har https-URL hoppes over,
 * så det kan trygt kjøres på nytt hvis det avbrytes. Når det melder
 * "0 gjenstår" kan /api/bilde-ruten og bildeUrlFor-omveien slettes.
 */
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

const prisma = new PrismaClient();

function dataUrlTilBuffer(dataUrl: string) {
  const komma = dataUrl.indexOf(",");
  const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/jpeg";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { buffer: Buffer.from(dataUrl.slice(komma + 1), "base64"), mime, ext };
}

async function lastOpp(dataUrl: string, sti: string): Promise<string> {
  const { buffer, mime, ext } = dataUrlTilBuffer(dataUrl);
  const { url } = await put(`${sti}.${ext}`, buffer, {
    access: "public",
    contentType: mime,
  });
  return url;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN mangler — sett den i .env først.");
  }

  let flyttet = 0;

  // ─── Brukere ────────────────────────────────────────────────────
  const brukere = await prisma.user.findMany({
    where: { bildeUrl: { startsWith: "data:" } },
    select: { id: true, bildeUrl: true },
  });
  for (const b of brukere) {
    const url = await lastOpp(b.bildeUrl!, `brukere/${b.id}`);
    await prisma.user.update({ where: { id: b.id }, data: { bildeUrl: url } });
    flyttet++;
    console.log(`bruker ${b.id} → ${url}`);
  }

  // ─── Øvelser (hovedbilde) ───────────────────────────────────────
  const ovelser = await prisma.ovelse.findMany({
    where: { bildeUrl: { startsWith: "data:" } },
    select: { id: true, bildeUrl: true },
  });
  for (const o of ovelser) {
    const url = await lastOpp(o.bildeUrl!, `ovelser/${o.id}`);
    await prisma.ovelse.update({ where: { id: o.id }, data: { bildeUrl: url } });
    flyttet++;
    console.log(`ovelse ${o.id} → ${url}`);
  }

  // ─── Faser ──────────────────────────────────────────────────────
  const faser = await prisma.ovelseFase.findMany({
    where: { bildeUrl: { startsWith: "data:" } },
    select: { id: true, ovelseId: true, rekkefolge: true, bildeUrl: true },
  });
  for (const f of faser) {
    const url = await lastOpp(
      f.bildeUrl!,
      `ovelser/${f.ovelseId}-fase-${f.rekkefolge}`,
    );
    await prisma.ovelseFase.update({ where: { id: f.id }, data: { bildeUrl: url } });
    flyttet++;
    console.log(`fase ${f.id} → ${url}`);
  }

  // ─── Oppsummering ───────────────────────────────────────────────
  const [bGjen, oGjen, fGjen] = await Promise.all([
    prisma.user.count({ where: { bildeUrl: { startsWith: "data:" } } }),
    prisma.ovelse.count({ where: { bildeUrl: { startsWith: "data:" } } }),
    prisma.ovelseFase.count({ where: { bildeUrl: { startsWith: "data:" } } }),
  ]);
  console.log(`\nFerdig: ${flyttet} bilder flyttet til Blob.`);
  console.log(`${bGjen + oGjen + fGjen} base64-bilder gjenstår i databasen.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
