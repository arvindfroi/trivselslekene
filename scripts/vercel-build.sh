#!/bin/bash
set -e
# Legg til manglende kolonner før prisma db push
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gjesteDeltaker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Turnering" ADD COLUMN IF NOT EXISTS "girPoeng" BOOLEAN NOT NULL DEFAULT true;
SQL
npx prisma db push --skip-generate
npx prisma generate
next build
