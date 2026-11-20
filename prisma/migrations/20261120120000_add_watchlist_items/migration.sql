-- CreateEnum
CREATE TYPE "WatchlistCategory" AS ENUM ('FOREX', 'CRYPTO', 'STOCKS', 'INDICES', 'COMMODITIES');

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "symbol" VARCHAR(32) NOT NULL,
    "normalizedSymbol" VARCHAR(32) NOT NULL,
    "category" "WatchlistCategory" NOT NULL,
    "notes" VARCHAR(500),
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchlistItem_accountId_category_idx" ON "WatchlistItem"("accountId", "category");

-- CreateIndex
CREATE INDEX "WatchlistItem_accountId_isFavorite_idx" ON "WatchlistItem"("accountId", "isFavorite");

-- CreateIndex
CREATE INDEX "WatchlistItem_accountId_createdAt_idx" ON "WatchlistItem"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_accountId_category_normalizedSymbol_key" ON "WatchlistItem"("accountId", "category", "normalizedSymbol");

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
