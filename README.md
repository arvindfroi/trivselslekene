# Trivselslekene

En nettside for å organisere, registrere og følge med på **Trivselslekene** –
vennegjengens egen variant av OL. Hvert år er hver deltaker vert for minst én
øvelse. Verten deltar ikke i sin egen øvelse, men er med i alle de andre.
Øvelser kan være individuelle eller lagbaserte (par, trekamper eller flere lag
mot hverandre, som bridge eller fotball).

Dette er et førsteutkast: funksjonalitet og datamodell er prioritert over
design, som kan finpusses senere.

## Funksjonalitet

- Opprett konto og logg inn (e-post/passord)
- Opprett øvelser (individuelle eller lagbaserte) med en vert
- Opprett lag og administrer lagmedlemmer
- Registrer resultater/poeng per deltaker eller lag
- Dashbord med sammenlagt stilling, poeng og resultater per øvelse

## Teknologi

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Auth.js (NextAuth v5)** med e-post/passord (Credentials-provider), slik at
  ingen ekstern OAuth-registrering er nødvendig
- **Prisma** mot **PostgreSQL** – valgt fordi appen skal driftes på Vercel, og
  Vercel sitt marketplace (f.eks. Neon) gir en gratis, serverløs Postgres-database
  som fungerer godt med serverless-funksjoner (i motsetning til SQLite, som ikke
  passer på en plattform med flyktig filsystem)

## Kom i gang lokalt

1. Kopier `.env.example` til `.env` og fyll inn en Postgres-tilkobling
   (f.eks. fra [neon.tech](https://neon.tech) eller Vercel sitt marketplace),
   samt en `AUTH_SECRET` (generer med `npx auth secret`).
2. Installer avhengigheter:

   ```bash
   npm install
   ```

3. Synkroniser databasen med Prisma-skjemaet:

   ```bash
   npx prisma db push
   ```

4. Start utviklingsserveren:

   ```bash
   npm run dev
   ```

Åpne [http://localhost:3000](http://localhost:3000).

## Deploy

Prosjektet er satt opp for å driftes på [Vercel](https://vercel.com), med
automatisk deploy ved push til `main`. Legg til en Postgres-database
(Neon/Vercel Marketplace) og sett miljøvariablene `DATABASE_URL` og
`AUTH_SECRET` i Vercel-prosjektet.
