-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OvelseType" AS ENUM ('INDIVIDUELL', 'LAG', 'TURNERING');

-- CreateEnum
CREATE TYPE "LagFormat" AS ENUM ('PAR', 'TRIO', 'FIRE_MOT_FIRE', 'FEM_MOT_FEM', 'FIRE_MOT_FEM', 'TRE_MOT_TRE_MOT_TRE', 'TO_MOT_TO_MOT_TO_MOT_TO', 'TO_LAG', 'TRE_LAG', 'FIRE_LAG', 'FLERE_LAG', 'ANNET');

-- CreateEnum
CREATE TYPE "OvelseStatus" AS ENUM ('PLANLAGT', 'PAAGAAR', 'FULLFORT');

-- CreateEnum
CREATE TYPE "Kvalitet" AS ENUM ('STYRKE', 'UTHOLDENHET', 'PRESISJON', 'FLAKS', 'LAGSPILL', 'TAKTIKK', 'HURTIGHET', 'KREATIVITET', 'KUNNSKAP', 'NERVER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "navn" TEXT NOT NULL,
    "fornavn" TEXT,
    "etternavn" TEXT,
    "epost" TEXT,
    "passordHash" TEXT,
    "bildeUrl" TEXT,
    "farge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesong" (
    "id" TEXT NOT NULL,
    "aar" INTEGER NOT NULL,
    "navn" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ovelse" (
    "id" TEXT NOT NULL,
    "navn" TEXT NOT NULL,
    "beskrivelse" TEXT,
    "lokasjon" TEXT,
    "type" "OvelseType" NOT NULL,
    "lagFormat" "LagFormat",
    "kvaliteter" "Kvalitet"[],
    "fellesLek" BOOLEAN NOT NULL DEFAULT false,
    "bildeUrl" TEXT,
    "status" "OvelseStatus" NOT NULL DEFAULT 'PLANLAGT',
    "aktivFase" INTEGER NOT NULL DEFAULT 0,
    "fullfortTid" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesongId" TEXT NOT NULL,
    "vertId" TEXT NOT NULL,
    "turneringId" TEXT,

    CONSTRAINT "Ovelse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvelseFase" (
    "id" TEXT NOT NULL,
    "ovelseId" TEXT NOT NULL,
    "rekkefolge" INTEGER NOT NULL,
    "tittel" TEXT,
    "bildeUrl" TEXT,

    CONSTRAINT "OvelseFase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lag" (
    "id" TEXT NOT NULL,
    "navn" TEXT NOT NULL,
    "ovelseId" TEXT NOT NULL,

    CONSTRAINT "Lag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LagMedlem" (
    "id" TEXT NOT NULL,
    "lagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "LagMedlem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultatIndividuell" (
    "id" TEXT NOT NULL,
    "ovelseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plassering" INTEGER,
    "poeng" DOUBLE PRECISION NOT NULL,
    "bonusPoeng" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utgattFase" INTEGER,
    "notat" TEXT,

    CONSTRAINT "ResultatIndividuell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultatLag" (
    "id" TEXT NOT NULL,
    "ovelseId" TEXT NOT NULL,
    "lagId" TEXT NOT NULL,
    "plassering" INTEGER,
    "poeng" DOUBLE PRECISION NOT NULL,
    "bonusPoeng" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notat" TEXT,

    CONSTRAINT "ResultatLag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turnering" (
    "id" TEXT NOT NULL,
    "navn" TEXT NOT NULL,
    "sesongId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANLAGT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turnering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurneringsDeltager" (
    "id" TEXT NOT NULL,
    "turneringId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,

    CONSTRAINT "TurneringsDeltager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurneringsKamp" (
    "id" TEXT NOT NULL,
    "turneringId" TEXT NOT NULL,
    "runde" INTEGER NOT NULL,
    "bracket" TEXT NOT NULL,
    "posisjon" INTEGER NOT NULL,
    "deltager1Id" TEXT,
    "deltager2Id" TEXT,
    "vinnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VENTER',

    CONSTRAINT "TurneringsKamp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_navn_key" ON "User"("navn");

-- CreateIndex
CREATE UNIQUE INDEX "User_epost_key" ON "User"("epost");

-- CreateIndex
CREATE UNIQUE INDEX "Sesong_aar_key" ON "Sesong"("aar");

-- CreateIndex
CREATE UNIQUE INDEX "Ovelse_turneringId_key" ON "Ovelse"("turneringId");

-- CreateIndex
CREATE INDEX "Ovelse_sesongId_idx" ON "Ovelse"("sesongId");

-- CreateIndex
CREATE INDEX "Ovelse_vertId_idx" ON "Ovelse"("vertId");

-- CreateIndex
CREATE INDEX "Ovelse_status_idx" ON "Ovelse"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OvelseFase_ovelseId_rekkefolge_key" ON "OvelseFase"("ovelseId", "rekkefolge");

-- CreateIndex
CREATE INDEX "LagMedlem_lagId_idx" ON "LagMedlem"("lagId");

-- CreateIndex
CREATE INDEX "LagMedlem_userId_idx" ON "LagMedlem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LagMedlem_lagId_userId_key" ON "LagMedlem"("lagId", "userId");

-- CreateIndex
CREATE INDEX "ResultatIndividuell_ovelseId_idx" ON "ResultatIndividuell"("ovelseId");

-- CreateIndex
CREATE INDEX "ResultatIndividuell_userId_idx" ON "ResultatIndividuell"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultatIndividuell_ovelseId_userId_key" ON "ResultatIndividuell"("ovelseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultatLag_lagId_key" ON "ResultatLag"("lagId");

-- CreateIndex
CREATE INDEX "ResultatLag_ovelseId_idx" ON "ResultatLag"("ovelseId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultatLag_ovelseId_lagId_key" ON "ResultatLag"("ovelseId", "lagId");

-- CreateIndex
CREATE UNIQUE INDEX "TurneringsDeltager_turneringId_userId_key" ON "TurneringsDeltager"("turneringId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TurneringsDeltager_turneringId_seed_key" ON "TurneringsDeltager"("turneringId", "seed");

-- CreateIndex
CREATE INDEX "TurneringsKamp_turneringId_idx" ON "TurneringsKamp"("turneringId");

-- CreateIndex
CREATE UNIQUE INDEX "TurneringsKamp_turneringId_bracket_runde_posisjon_key" ON "TurneringsKamp"("turneringId", "bracket", "runde", "posisjon");

-- AddForeignKey
ALTER TABLE "Ovelse" ADD CONSTRAINT "Ovelse_sesongId_fkey" FOREIGN KEY ("sesongId") REFERENCES "Sesong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ovelse" ADD CONSTRAINT "Ovelse_vertId_fkey" FOREIGN KEY ("vertId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ovelse" ADD CONSTRAINT "Ovelse_turneringId_fkey" FOREIGN KEY ("turneringId") REFERENCES "Turnering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvelseFase" ADD CONSTRAINT "OvelseFase_ovelseId_fkey" FOREIGN KEY ("ovelseId") REFERENCES "Ovelse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lag" ADD CONSTRAINT "Lag_ovelseId_fkey" FOREIGN KEY ("ovelseId") REFERENCES "Ovelse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LagMedlem" ADD CONSTRAINT "LagMedlem_lagId_fkey" FOREIGN KEY ("lagId") REFERENCES "Lag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LagMedlem" ADD CONSTRAINT "LagMedlem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultatIndividuell" ADD CONSTRAINT "ResultatIndividuell_ovelseId_fkey" FOREIGN KEY ("ovelseId") REFERENCES "Ovelse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultatIndividuell" ADD CONSTRAINT "ResultatIndividuell_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultatLag" ADD CONSTRAINT "ResultatLag_ovelseId_fkey" FOREIGN KEY ("ovelseId") REFERENCES "Ovelse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultatLag" ADD CONSTRAINT "ResultatLag_lagId_fkey" FOREIGN KEY ("lagId") REFERENCES "Lag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turnering" ADD CONSTRAINT "Turnering_sesongId_fkey" FOREIGN KEY ("sesongId") REFERENCES "Sesong"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurneringsDeltager" ADD CONSTRAINT "TurneringsDeltager_turneringId_fkey" FOREIGN KEY ("turneringId") REFERENCES "Turnering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurneringsDeltager" ADD CONSTRAINT "TurneringsDeltager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurneringsKamp" ADD CONSTRAINT "TurneringsKamp_turneringId_fkey" FOREIGN KEY ("turneringId") REFERENCES "Turnering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurneringsKamp" ADD CONSTRAINT "TurneringsKamp_deltager1Id_fkey" FOREIGN KEY ("deltager1Id") REFERENCES "TurneringsDeltager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurneringsKamp" ADD CONSTRAINT "TurneringsKamp_deltager2Id_fkey" FOREIGN KEY ("deltager2Id") REFERENCES "TurneringsDeltager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurneringsKamp" ADD CONSTRAINT "TurneringsKamp_vinnerId_fkey" FOREIGN KEY ("vinnerId") REFERENCES "TurneringsDeltager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

