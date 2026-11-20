-- DropIndex
DROP INDEX "AccountTransaction_accountId_createdAt_idx";

-- AlterTable
ALTER TABLE "AccountTransaction" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "AccountTransaction_accountId_date_idx" ON "AccountTransaction"("accountId", "date");
