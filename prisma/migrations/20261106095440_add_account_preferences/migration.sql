-- AlterTable
ALTER TABLE "TradingAccount" ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
ADD COLUMN     "defaultLeverage" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "defaultMarket" TEXT NOT NULL DEFAULT 'Forex',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos';
