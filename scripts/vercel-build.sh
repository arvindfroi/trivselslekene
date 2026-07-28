#!/bin/bash
set -eo pipefail

# Databasestegene er den skjøre delen av deployen: Neon (free tier) suspenderer
# etter ~5 min inaktivitet, og DATABASE_URL peker på pooler-endepunktet siden
# prosjektet ikke har en DIRECT_URL. Et kaldt bygg treffer derfor ofte en
# database som holder på å våkne, eller en advisory lock som ikke slipper med
# en gang — og med `set -e` velter det hele deployen selv om koden er helt fin.
#
# Derfor prøves hvert databasesteg på nytt med økende pause. Klarer det seg
# fortsatt ikke, skal bygget faktisk feile: da er ikke skjemaet synkronisert,
# og det er tryggere å bli stående på forrige deploy enn å slippe ut kode som
# forventer kolonner databasen ikke har.

proev_paa_nytt() {
  local beskrivelse="$1"
  shift
  local forsok=1
  local maks=5
  local pause=3

  until "$@"; do
    if [ "$forsok" -ge "$maks" ]; then
      echo "✗ Klarte ikke å $beskrivelse etter $maks forsøk." >&2
      return 1
    fi
    echo "… Klarte ikke å $beskrivelse (forsøk $forsok/$maks) — nytt forsøk om ${pause}s" >&2
    sleep "$pause"
    forsok=$((forsok + 1))
    pause=$((pause * 2))
  done

  echo "✓ Ferdig: $beskrivelse"
}

# Billig spørring som bare finnes for å vekke databasen, slik at de tyngre
# stegene under slipper å betale for resume-tiden.
vekk_databasen() {
  echo 'SELECT 1;' | npx prisma db execute --schema=prisma/schema.prisma --stdin
}

# Kolonner som mangler i produksjonsdatabasen. IF NOT EXISTS gjør steget
# idempotent, så det er trygt å kjøre om igjen ved et nytt forsøk.
legg_til_kolonner() {
  npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gjesteDeltaker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Turnering" ADD COLUMN IF NOT EXISTS "girPoeng" BOOLEAN NOT NULL DEFAULT true;
SQL
}

synkroniser_skjema() {
  npx prisma db push --skip-generate
}

# Vekkingen er bare en optimalisering, så den får aldri velte bygget på egen
# hånd: går den ikke, tar retry-logikken under seg resten.
echo "→ Vekker databasen…"
vekk_databasen || echo "… Databasen svarte ikke med en gang — stegene under prøver på nytt." >&2

proev_paa_nytt "legge til manglende kolonner" legg_til_kolonner
proev_paa_nytt "synkronisere skjemaet" synkroniser_skjema

npx prisma generate
next build
