-- DropIndex
DROP INDEX "Ovelse_sesongId_idx";

-- DropIndex
DROP INDEX "Ovelse_status_idx";

-- DropIndex
DROP INDEX "Ovelse_vertId_idx";

-- AlterTable
ALTER TABLE "Turnering" ADD COLUMN     "girPoeng" BOOLEAN NOT NULL DEFAULT true;
