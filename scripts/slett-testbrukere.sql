-- ============================================================================
-- Sletter alle testbrukere (navn starter med "D", f.eks. D1–D9) og alt
-- tilhørende data i riktig FK-rekkefølge.
--
-- Kjøres mot produksjonsdatabasen, f.eks. via Vercel Postgres dashboard
-- eller:  psql "$DATABASE_URL" -f scripts/slett-testbrukere.sql
--
-- Tilsvarer cleanupDUsers() i src/lib/actions/testdeltakere.ts
-- ============================================================================

BEGIN;

-- 1. Fang opp ID-ene til alle D-brukere
CREATE TEMP TABLE _d_user_ids ON COMMIT DROP AS
SELECT id FROM "User" WHERE navn LIKE 'D%';

-- 2. Nullstill vinner-referanser i turneringskamper
UPDATE "TurneringsKamp"
SET "vinnerId" = NULL
WHERE "vinnerId" IN (SELECT id FROM _d_user_ids);

-- 3. Nullstill deltager-referanser i turneringskamper
UPDATE "TurneringsKamp"
SET "deltager1Id" = NULL, "deltager2Id" = NULL
WHERE "deltager1Id" IN (SELECT id FROM _d_user_ids)
   OR "deltager2Id" IN (SELECT id FROM _d_user_ids);

-- 4. Slett turneringsdeltagere
DELETE FROM "TurneringsDeltager"
WHERE "userId" IN (SELECT id FROM _d_user_ids);

-- 5. Slett lagmedlemskap
DELETE FROM "LagMedlem"
WHERE "userId" IN (SELECT id FROM _d_user_ids);

-- 6. Slett individuelle resultater
DELETE FROM "ResultatIndividuell"
WHERE "userId" IN (SELECT id FROM _d_user_ids);

-- 7. Slett lagresultater for lag med D-brukere
DELETE FROM "ResultatLag"
WHERE "lagId" IN (
  SELECT DISTINCT lm."lagId"
  FROM "LagMedlem" lm
  WHERE lm."userId" IN (SELECT id FROM _d_user_ids)
);

-- 8. Slett lag med D-brukere
DELETE FROM "Lag"
WHERE id IN (
  SELECT DISTINCT lm."lagId"
  FROM "LagMedlem" lm
  WHERE lm."userId" IN (SELECT id FROM _d_user_ids)
);

-- 9. Slett øvelser: "Testpoeng" eller der vert er D-bruker
DELETE FROM "Ovelse"
WHERE navn = 'Testpoeng'
   OR "vertId" IN (SELECT id FROM _d_user_ids);

-- 10. Slett selve D-brukerne
DELETE FROM "User"
WHERE id IN (SELECT id FROM _d_user_ids);

COMMIT;

-- Vis antall gjenværende brukere (sanity check)
SELECT count(*) AS gjenværende_brukere FROM "User";
