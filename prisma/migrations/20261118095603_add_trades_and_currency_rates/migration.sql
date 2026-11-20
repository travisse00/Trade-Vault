-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('FOREX', 'CRYPTO_SPOT', 'CRYPTO_FUTURES');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "marketType" "MarketType" NOT NULL,
    "asset" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "exitPrice" DECIMAL(20,8),
    "quantity" DECIMAL(20,8) NOT NULL,
    "positionValue" DECIMAL(20,8),
    "lotSize" DECIMAL(12,4),
    "leverage" INTEGER NOT NULL DEFAULT 1,
    "marginUsed" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "entryConversionRate" DECIMAL(20,10),
    "entryConversionRateAt" TIMESTAMP(3),
    "exitConversionRate" DECIMAL(20,10),
    "exitConversionRateAt" TIMESTAMP(3),
    "stopLoss" DECIMAL(20,8),
    "takeProfit" DECIMAL(20,8),
    "riskPercentage" DECIMAL(8,4),
    "fees" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "fundingFees" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "grossPnL" DECIMAL(20,8),
    "totalFees" DECIMAL(20,8),
    "netPnL" DECIMAL(20,8),
    "returnPercentage" DECIMAL(12,4),
    "strategy" TEXT,
    "notes" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeImage" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL,
    "fromCurrency" VARCHAR(3) NOT NULL,
    "toCurrency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(20,10) NOT NULL,
    "provider" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_accountId_entryDate_idx" ON "Trade"("accountId", "entryDate");

-- CreateIndex
CREATE INDEX "Trade_accountId_status_idx" ON "Trade"("accountId", "status");

-- CreateIndex
CREATE INDEX "Trade_accountId_marketType_idx" ON "Trade"("accountId", "marketType");

-- CreateIndex
CREATE INDEX "TradeImage_tradeId_idx" ON "TradeImage"("tradeId");

-- CreateIndex
CREATE INDEX "CurrencyRate_expiresAt_idx" ON "CurrencyRate"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_fromCurrency_toCurrency_key" ON "CurrencyRate"("fromCurrency", "toCurrency");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeImage" ADD CONSTRAINT "TradeImage_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
