import { put, del } from "@vercel/blob";

/**
 * Laster opp et bilde (data-URL eller buffer) til Vercel Blob og
 * returnerer den offentlige URL-en. `bildeUrlFor()` slipper allerede
 * ekte URL-er rett gjennom, så ingen andre filer må endres.
 *
 * Ved sletting: `slettFraBlob(url)` fjerner filen.
 */

function dataUrlTilBuffer(dataUrl: string): { buffer: Buffer; mime: string; ext: string } {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const ext = mime.split("/")[1] === "png" ? "png" : "jpg";
  return { buffer: Buffer.from(base64, "base64"), mime, ext };
}

export async function lastOppBilde(
  dataUrl: string,
  sti: string,
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  try {
    const { buffer, mime, ext } = dataUrlTilBuffer(dataUrl);
    const { url } = await put(`${sti}.${ext}`, buffer, {
      access: "public",
      contentType: mime,
    });
    return url;
  } catch {
    // Mangler token / nettverksfeil: fall tilbake til data-URL i databasen
    // slik at bildet ALDRI forsvinner stille. /api/bilde-ruten serverer det,
    // og migreringsskriptet flytter det til Blob senere.
    return dataUrl;
  }
}

export async function slettFraBlob(url: string | null): Promise<void> {
  if (!url || url.startsWith("data:") || url.startsWith("/api/")) return;
  try {
    await del(url);
  } catch {
    // Best-effort — ignorer feil ved sletting
  }
}
