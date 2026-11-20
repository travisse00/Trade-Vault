-- CreateEnum
CREATE TYPE "AccountTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "TradingAccount" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "initialBalance" DECIMAL(20,8) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "balanceSetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "AccountTransactionType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceCorrection" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "previousAmount" DECIMAL(20,8) NOT NULL,
    "newAmount" DECIMAL(20,8) NOT NULL,
    "reason" TEXT NOT NULL,
    "correctedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingAccount_userId_key" ON "TradingAccount"("userId");

-- CreateIndex
CREATE INDEX "AccountTransaction_accountId_createdAt_idx" ON "AccountTransaction"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "BalanceCorrection_accountId_correctedAt_idx" ON "BalanceCorrection"("accountId", "correctedAt");

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceCorrection" ADD CONSTRAINT "BalanceCorrection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
