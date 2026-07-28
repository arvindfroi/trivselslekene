-- Nullstilling før Trivselslekene 2026 starter.
--
-- Fjerner alle brukere og alt som ble lagt inn mens appen ble testet: leker,
-- faser, lag, resultater og turneringer. Sesongene (årgangene) beholdes, og
-- fjorårets tall ligger i koden (src/lib/fjoraaret.ts), ikke i databasen — de
-- er derfor ikke berørt.
--
-- Kjør lokalt med DATABASE_URL satt i .env:
--
--   npx prisma db execute --schema=prisma/schema.prisma --file=scripts/nullstill.sql
--
-- Rekkefølgen er styrt av fremmednøklene: barn før foreldre. Alt skjer i én
-- transaksjon, så enten går hele slettingen gjennom, eller ingenting.

BEGIN;

DELETE FROM "ResultatIndividuell";
DELETE FROM "ResultatLag";
DELETE FROM "LagMedlem";
DELETE FROM "Lag";
DELETE FROM "OvelseFase";
DELETE FROM "TurneringsKamp";
DELETE FROM "TurneringsDeltager";
-- Øvelser før turneringer: Ovelse.turneringId peker på Turnering.
DELETE FROM "Ovelse";
DELETE FROM "Turnering";
DELETE FROM "User";
-- "Sesong" røres ikke.

COMMIT;
