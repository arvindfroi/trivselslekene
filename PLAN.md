# Trivselslekene — teknisk plan og veikart

## 1. Hvorfor knappene var trege (rotårsaker)

Hver knapp i appen er en Next.js server action. Ett klikk utløste denne kjeden:
POST til serverless-funksjon → `auth()` → 2–3 sekvensielle Prisma-spørringer →
`revalidatePath` → **hele siden re-rendres på serveren** → payloaden streames
tilbake. Tre ting gjorde kjeden treg:

1. **Base64-bilder i payloaden.** Fasebilder og profilbilder lagres som
   data-URL-er i Postgres (opptil ~500 kB per bilde etter base64-overhead).
   Øvelsessiden selekterte *alle* fasebilder, og re-renderet etter hvert
   knappetrykk inlinet dem på nytt i RSC-payloaden. Et fasebytte kunne dermed
   flytte flere megabyte for å endre ett tall.
2. **Neon free tier suspenderer databasen** etter ~5 min inaktivitet.
   Første spørring etter pause betaler 0,5–2 s "resume", og hver kald
   serverless-invokasjon betaler i tillegg TCP/TLS-oppkobling mot Postgres.
3. **Les-så-skriv-mønster i actions.** `krevVert` gjorde en egen
   autorisasjonsspørring før selve skrivingen — to sekvensielle rundturer der
   én betinget `updateMany`/`deleteMany` holder.

Patchen i dette repoet fikser (1) og (3) i kode. (2) krever konfigurasjon —
se neste seksjon. Kort om kodeendringene:

- `/api/bilde/[type]/[id]` serverer bilder fra databasen med
  `Cache-Control: immutable` og innholds-hash i URL-en; alle sider sender nå
  små URL-er i stedet for base64. CDN og nettleser cacher bildene, og
  revalideringspayloaden krymper fra megabyte til kilobyte.
- `FaseNavigator` er en klientkomponent med `useOptimistic`: verten ser
  fasebyttet **umiddelbart**, serveren synkes i bakgrunnen. Fasebildene
  forhåndslastes skjult, så byttene føles øyeblikkelige.
- `LiveRefresh` gjør at tilskuere følger fasebytter og resultater live
  (poll hvert 10. sekund mens øvelsen pågår — billig nå som payloaden er liten).
- `settAktivFase`, `settOvelseStatus`, `slettOvelse` og `fjernLagmedlem` er
  omskrevet til én atomisk, vert-betinget spørring hver.
- Øvelsessiden og dashbordet kjører uavhengige spørringer parallelt, og
  fotball-kamp-siden slutter å dra `passordHash` + base64 ut av databasen.

## 2. Infrastruktur (gjøres i Vercel/Neon, ikke i kode) — gjør dette først

**Samlokaliser regionene.** Sjekk Neon-prosjektets region (sannsynligvis
`aws-eu-central-1`, Frankfurt) og sett Vercel-funksjonsregionen til samme:
Project → Settings → Functions → Region → `fra1`. En region-mismatch legger
50–150 ms på *hver* spørring, og actions gjør flere spørringer per klikk.

**Slå på Fluid Compute** (Project → Settings → Functions). Instansene
gjenbrukes mellom requests, så både Prisma-klienten og DB-tilkoblingen
overlever — kaldstartene som er igjen blir langt sjeldnere.

**Bruk pooled connection string.** `DATABASE_URL` skal peke på Neons
`-pooler`-endepunkt (PgBouncer). Uten pooler kan serverless-funksjoner
tømme connection-kvoten og køe.

**Vurder Neon-driveren for Prisma** når du vil barbere de siste
hundre millisekundene av kalde invokasjoner:

```bash
npm i @prisma/adapter-neon @neondatabase/serverless
```

```ts
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
export const prisma =
  (globalThis as { prisma?: PrismaClient }).prisma ??
  new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production")
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
```

(Krever `previewFeatures = ["driverAdapters"]` i schema-generatoren på
Prisma 6.) Databasen kontaktes da over HTTP i stedet for TCP — merkbart
raskere fra kald funksjon.

Neon-autosuspend kan ikke skrus av på free tier. På selve lekedagene er den
i praksis irrelevant (trafikken holder databasen våken); det første treffet
om morgenen tar støyten.

## 3. Neste strukturelle steg: bilder ut av databasen

Ruten `/api/bilde` er en bro, ikke endestasjonen. Riktig løsning er
**Vercel Blob** (gratisnivå holder lenge for en vennegjeng):

1. `npm i @vercel/blob`, legg til Blob-store i Vercel-prosjektet
   (miljøvariabelen `BLOB_READ_WRITE_TOKEN` settes automatisk).
2. I `oppdaterBilde` og `opprettOvelse`: `put(sti, buffer, { access: "public" })`
   og lagre **URL-en** i `bildeUrl`-feltet i stedet for data-URL-en.
   `bildeUrlFor()` er allerede skrevet slik at ekte URL-er passerer rett
   gjennom — ingen andre filer må endres.
3. Engangsskript som migrerer eksisterende data-URL-er til Blob.
4. Slett `/api/bilde`-ruten når migreringen er ferdig.

Behold klientsidens nedskalering (1024 px JPEG) — den er bra. Legg gjerne
til WebP (`canvas.toDataURL("image/webp", 0.8)`) for ~30 % mindre filer.

## 4. Visjon og veikart

Kjerneidéen — vennegjengens eget OL med vert-rotasjon, egenskaper og
sammenlagt stilling — er sterk. Bygg den ut i denne rekkefølgen; hvert trinn
gir synlig verdi på neste samling.

### Fase A — lekedagen (størst effekt per time)

- **Live-modus på øvelsessiden** er halvveis levert med `LiveRefresh`.
  Neste steg: en dedikert «storskjerm»-visning (`/ovelser/[id]/live`) uten
  navigasjon — aktiv fase i fullskjerm, resultater som ticker inn. Kastes
  til en TV via Chromecast/AirPlay.
- **Poengforslag ved plassering.** Verten skriver i dag både plassering og
  poeng manuelt. Definér en standard poengtabell per sesong
  (f.eks. 10-8-6-5-4-3-2-1) og forhåndsutfyll poengfeltet fra plasseringen,
  med mulighet for overstyring. Fjerner den vanligste feilkilden.
- **Seremoni-øyeblikk.** `canvas-confetti` er allerede installert — bruk den
  når en øvelse settes til FULLFØRT: pallvisning med gull/sølv/bronse og
  konfetti. Billig, og det er slikt folk husker.

### Fase B — mellom lekene

- **Historikk på tvers av sesonger.** Datamodellen har `Sesong` — bygg
  `/historie`: tidligere vinnere, «all time»-medaljestatistikk, rekorder
  som består. Dette er limet som gjør appen til en tradisjon.
- **Øvelsesbibliotek.** La øvelser markeres som «gjenbrukbare»; neste års
  vert kan klone i stedet for å skrive alt på nytt. Krever bare et
  `malAv`-felt og en kopieringsaction.
- **Push-lignende varsling light:** en enkel «neste øvelse starter»-banner
  drevet av `status`-feltet, synlig på alle sider via layouten.

### Fase C — når grunnmuren over står

- **Ekte realtime** (bytt polling mot server-sent events eller Pusher/Ably
  free tier) hvis 10-sekunders forsinkelse noen gang oppleves som treg.
- **PWA-manifest + ikoner** så appen kan «installeres» på hjemskjermen —
  den brukes jo primært på mobil ute i felt.
- **PIN-kode per bruker.** Innlogging er i dag kun navn; hvem som helst kan
  logge inn som hvem som helst. For en vennegjeng er det en akseptabel og
  bevisst avveining, men en valgfri 4-sifret PIN (hash i `passordHash`-feltet
  som allerede finnes) stopper tull uten å ødelegge friksjonsfriheten.

## 5. Struktur og kodehygiene

Arkitekturen (App Router + server actions + Prisma) er riktig for
prosjektet — ikke bytt den. Tre prinsipper å holde fast ved:

1. **Autorisasjon i where-betingelsen.** Mønsteret fra denne patchen
   (`updateMany({ where: { id, vertId } })`) skal være standarden for alle
   nye actions: én rundtur, umulig å glemme sjekken.
2. **Selektér eksplisitt, aldri `include: { user: true }`.** Fullobjekter
   drar `passordHash` og blobber ut av databasen. Lag gjerne en delt
   `brukerSelect = { id: true, navn: true, bildeUrl: true }`-konstant.
3. **Tunge/interaktive øyeblikk = klientkomponent med optimistisk state;
   alt annet = server.** `FaseNavigator` og `TurneringsBracket` er malen.
   Resultatregistrering er neste kandidat hvis den fortsatt føles treg
   etter infra-fiksene.

Småting: `opprettTurnering` og `opprettLagkamp` bør pakke flerstegsskriving
i `prisma.$transaction` så en halvferdig turnering ikke kan oppstå ved feil
midtveis. Og legg til `@@index([sesongId])` på `Ovelse` — listespørringene
filtrerer alltid på den.

## 6. Profesjonelt uttrykk

Fundamentet er uvanlig bra for et førsteutkast: Amstelvar som display-font
er et karakterfullt valg, fargesystemet er konsistent, og komponentene
(Badge, RankBadge, StatCard) er gjenbrukbare. Det som skiller «pen hobbyapp»
fra «profesjonell» nå er disiplin, ikke mer pynt:

**Velg ett signaturuttrykk og demp resten.** Landingssiden har i dag tre
konkurrerende effekter (WebGL-shader, orbit-bilder med konfetti, interaktiv
tittel). Behold PrismaticBurst som signaturen, la resten være rolig.
Last shaderen med `next/dynamic` (`ssr: false`) og hopp over den ved
`prefers-reduced-motion` — den koster i dag GPU og JS på mobil, som er
enheten appen faktisk brukes på.

**Konsistent tomtilstand og feiltilstand.** Hver liste («Ingen resultater
ennå», «Ingen lag …») bør ha samme visuelle komponent: ikon, én setning om
hva som mangler, og knappen som fikser det. Tomskjermer er invitasjoner,
ikke beklagelser.

**Mikrointeraksjoner med mening.** Nå som knappene svarer øyeblikkelig,
legg en subtil bekreftelse der data faktisk lagres: en kort «Lagret ✓»-state
på resultatknappen (600 ms) sier mer enn en spinner. Én orkestrert
animasjon (pallseremonien) slår ti spredte hover-effekter.

**Typografisk ro i tabeller.** Stilling og resultater er tallinnhold —
`tabular-nums` brukes allerede riktig; stram inn til maks to skriftstørrelser
per kort og la RankBadge være det eneste fargede elementet i raden.

**Kvalitetsgulv uten fanfare:** synlig keyboard-fokus overalt (Button har
det), `loading.tsx` finnes allerede for alle ruter (bra), og test alt på
375 px bredde — det er der lekene faktisk skjer.

## 7. Rekkefølge

1. Apliker patchen, deploy, og sett region + Fluid Compute + pooler (30 min).
2. Verifiser på mobil at fasebytter er øyeblikkelige og at
   resultatregistrering lander < 1 s varm.
3. Vercel Blob-migreringen (seksjon 3).
4. Fase A-funksjonene før neste samling.
5. Neon-adapteret og Fase B når du kjenner behovet.
