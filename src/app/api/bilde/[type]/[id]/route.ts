import { prisma } from "@/lib/prisma";

/**
 * Serverer bilder som i dag ligger som base64 i databasen, med aggressiv
 * caching. URL-ene inneholder en innholds-hash (?v=...), så innholdet kan
 * caches "evig" — endres bildet, endres URL-en.
 *
 * Dette gjør at bildene lastes ÉN gang per klient/CDN i stedet for å bli
 * inlinet i hver eneste server-render. Når lagringen senere flyttes til
 * Vercel Blob kan hele denne ruten slettes uten andre endringer.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;

  let dataUrl: string | null | undefined;
  if (type === "bruker") {
    dataUrl = (
      await prisma.user.findUnique({ where: { id }, select: { bildeUrl: true } })
    )?.bildeUrl;
  } else if (type === "ovelse") {
    dataUrl = (
      await prisma.ovelse.findUnique({ where: { id }, select: { bildeUrl: true } })
    )?.bildeUrl;
  } else if (type === "fase") {
    dataUrl = (
      await prisma.ovelseFase.findUnique({ where: { id }, select: { bildeUrl: true } })
    )?.bildeUrl;
  } else {
    return new Response("Ukjent bildetype", { status: 400 });
  }

  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return new Response("Ikke funnet", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  const komma = dataUrl.indexOf(",");
  const semikolon = dataUrl.indexOf(";");
  const mime = semikolon > 5 ? dataUrl.slice(5, semikolon) : "image/jpeg";
  const bytes = Buffer.from(dataUrl.slice(komma + 1), "base64");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
