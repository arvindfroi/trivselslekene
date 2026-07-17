/**
 * Avsløring av leknavn. Frem til avsløringstidspunktet er leknavnene skjult for
 * alle andre enn verten som eier leken — man ser at leken finnes, men ikke hva
 * den heter. Etter tidspunktet vises alle navn åpent.
 *
 * Tidspunkt: 28. juli kl. 12:00 norsk tid (Europe/Oslo, sommertid = UTC+2).
 */

export const AVSLORINGSTIDSPUNKT = new Date("2026-07-28T12:00:00+02:00");

/** ISO-streng brukt av nedtellingskomponenten på klienten. */
export const AVSLORINGSTIDSPUNKT_ISO = AVSLORINGSTIDSPUNKT.toISOString();

/** Er leknavnene avslørt ennå? */
export function erAvslort(naa: Date = new Date()): boolean {
  return naa.getTime() >= AVSLORINGSTIDSPUNKT.getTime();
}

/** Teksten som vises i stedet for et skjult leknavn. */
export const SKJULT_LEKNAVN = "Hemmelig lek";

/**
 * Returnerer leknavnet som skal vises. Verten (eieren) ser alltid sitt eget
 * navn, og etter avsløring ser alle alt. Ellers skjules navnet.
 */
export function visLekNavn(
  navn: string,
  erVert: boolean,
  avslort: boolean = erAvslort(),
): string {
  if (avslort || erVert) return navn;
  return SKJULT_LEKNAVN;
}
