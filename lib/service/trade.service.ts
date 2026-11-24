
import "server-only";

import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { tradeSchema, closeTradeSchema } from "@/lib/validation/trade";
import { calculateTrade } from "@/lib/calculations";
import { getForexContractSize, getQuoteCurrency } from "@/lib/calculations/pair";
import { getCurrencyRate } from "@/lib/service/currency-rate.service";
import { TRADING_FEES } from "@/lib/config/trading-fees";
import {
  MAX_TRADE_IMAGES,
  validateTradeImageFiles,
  uploadTradeImageObjects,
  deleteTradeImageObjects,
} from "@/lib/service/trade-image.service";
import type { Trade } from "@/app/generated/prisma/client";

async function getUserTradingAccount() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be logged in to perform this action.");
  }

  const account = await prisma.tradingAccount.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!account) {
    throw new Error("Complete your account setup before creating trades.");
  }

  return { account, userId: user.id };
}

function decimalsEqual(
  left: Decimal | null | undefined,
  right: Decimal | null | undefined
): boolean {
  if (left === null || left === undefined) {
    return right === null || right === undefined;
  }

  if (right === null || right === undefined) {
    return false;
  }

  return left.equals(right);
}

function datesEqual(
  left: Date | null | undefined,
  right: Date | null | undefined
): boolean {
  if (left === null || left === undefined) {
    return right === null || right === undefined;
  }

  if (right === null || right === undefined) {
    return false;
  }

  return left.getTime() === right.getTime();
}

function validateTradeInput(input: unknown) {
  const result = tradeSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      result.error.issues
        .map((issue) => issue.message)
        .join(" ")
    );
  }

  return result.data;
}

function validateCloseInput(input: unknown) {
  const result = closeTradeSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      result.error.issues
        .map((issue) => issue.message)
        .join(" ")
    );
  }

  return result.data;
}

async function getConversionRate(
  fromCurrency: string,
  toCurrency: string
) {
  const result = await getCurrencyRate(fromCurrency, toCurrency);

  return {
    rate: result.rate,
    fetchedAt: result.fetchedAt,
  };
}

async function calculateOpeningPosition(
  input: ReturnType<typeof validateTradeInput>,
  accountCurrency: string
) {
  const entryPrice = new Decimal(String(input.entryPrice));
  const leverage = input.leverage;

  let positionQuantity: Decimal;
  let marginUsed: Decimal;

  const quoteCurrency = getQuoteCurrency(input.asset);

  const conversion = await getConversionRate(
    quoteCurrency,
    accountCurrency
  );

  if (input.marketType === "FOREX") {
    const contractSize = getForexContractSize(input.asset);

    positionQuantity = new Decimal(String(input.lotSize))
      .mul(contractSize);

    const notionalValue = positionQuantity
      .mul(entryPrice)
      .mul(conversion.rate);

    marginUsed = notionalValue.div(leverage);
  } else {
    const positionValue = new Decimal(
      String(input.positionValue)
    );

    positionQuantity = positionValue
      .div(conversion.rate)
      .div(entryPrice);

    marginUsed =
      input.marketType === "CRYPTO_FUTURES"
        ? positionValue.div(leverage)
        : new Decimal(0);
  }

  return {
    positionQuantity,
    marginUsed,
    entryConversionRate: conversion.rate,
    entryConversionRateAt: conversion.fetchedAt,
  };
}

async function calculateClosedTrade(
  input: ReturnType<typeof validateTradeInput>,
  accountCurrency: string,
  positionQuantity: Decimal,
  entryConversionRate: Decimal,
  additionalFees: Decimal = new Decimal(0)
) {
  if (input.status !== "CLOSED") {
    throw new Error("Trade must be closed to calculate realised P&L.");
  }

  const conversionCurrency = getQuoteCurrency(input.asset);

  const conversion = await getConversionRate(
    conversionCurrency,
    accountCurrency
  );

  const common = {
    entryPrice: new Decimal(String(input.entryPrice)),
    exitPrice: new Decimal(String(input.exitPrice)),
    positionQuantity,
    exitConversionRate: conversion.rate,
  };

  let result;

  switch (input.marketType) {
    case "FOREX":
      result = calculateTrade({
        marketType: "FOREX",
        direction: input.direction,
        asset: input.asset,
        entryPrice: common.entryPrice,
        exitPrice: common.exitPrice,
        lotSize: new Decimal(String(input.lotSize)),
        commissionPerLot: TRADING_FEES.FOREX_COMMISSION_PER_LOT,
        accountCurrency,
        entryConversionRate,
        exitConversionRate: conversion.rate,
        leverage: input.leverage,
        additionalFees,
      });
      break;

    case "CRYPTO_SPOT":
      result = calculateTrade({
        marketType: "CRYPTO_SPOT",
        ...common,
        positionValue: new Decimal(String(input.positionValue)),
        fees: new Decimal(String(input.fees)),
        additionalFees,
      });
      break;

    case "CRYPTO_FUTURES":
      result = calculateTrade({
        marketType: "CRYPTO_FUTURES",
        ...common,
        positionValue: new Decimal(String(input.positionValue)),
        tradingFeeRate: TRADING_FEES.CRYPTO_FUTURES_FEE_RATE,
        fundingFees: new Decimal(String(input.fundingFees)),
        leverage: input.leverage,
        direction: input.direction,
        additionalFees,
      });
      break;
  }

  return {
    result,
    exitConversionRate: conversion.rate,
    exitConversionRateAt: conversion.fetchedAt,
  };
}

/**
 * Calculate the realised result of closing an existing open trade.
 *
 * Entry-side values (price, quantity, conversion snapshot, position size) are
 * read from the stored trade and never recalculated, so the original entry
 * information is preserved. The market-specific calculation engine is reused
 * for the final P&L.
 */
async function calculateClosingTrade(
  trade: Trade,
  exitPrice: Decimal,
  accountCurrency: string,
  additionalFees: Decimal,
  additionalFundingFees: Decimal
) {
  if (!trade.entryConversionRate) {
    throw new Error(
      "This trade is missing its entry conversion rate and cannot be closed."
    );
  }

  const conversionCurrency = getQuoteCurrency(trade.asset);

  const conversion = await getConversionRate(
    conversionCurrency,
    accountCurrency
  );

  const entryConversionRate = trade.entryConversionRate;

  switch (trade.marketType) {
    case "FOREX": {
      if (!trade.lotSize) {
        throw new Error("This forex trade is missing its lot size.");
      }

      return {
        result: calculateTrade({
          marketType: "FOREX",
          direction: trade.direction,
          asset: trade.asset,
          entryPrice: trade.entryPrice,
          exitPrice,
          lotSize: trade.lotSize,
          commissionPerLot: TRADING_FEES.FOREX_COMMISSION_PER_LOT,
          accountCurrency,
          entryConversionRate,
          exitConversionRate: conversion.rate,
          leverage: trade.leverage,
          additionalFees,
        }),
        exitConversionRate: conversion.rate,
        exitConversionRateAt: conversion.fetchedAt,
      };
    }

    case "CRYPTO_SPOT": {
      if (!trade.positionValue) {
        throw new Error("This trade is missing its position value.");
      }

      return {
        result: calculateTrade({
          marketType: "CRYPTO_SPOT",
          entryPrice: trade.entryPrice,
          exitPrice,
          positionValue: trade.positionValue,
          positionQuantity: trade.quantity,
          fees: trade.fees,
          exitConversionRate: conversion.rate,
          additionalFees,
        }),
        exitConversionRate: conversion.rate,
        exitConversionRateAt: conversion.fetchedAt,
      };
    }

    case "CRYPTO_FUTURES": {
      if (!trade.positionValue) {
        throw new Error("This trade is missing its position value.");
      }

      return {
        result: calculateTrade({
          marketType: "CRYPTO_FUTURES",
          entryPrice: trade.entryPrice,
          exitPrice,
          positionValue: trade.positionValue,
          positionQuantity: trade.quantity,
          tradingFeeRate: TRADING_FEES.CRYPTO_FUTURES_FEE_RATE,
          exitConversionRate: conversion.rate,
          fundingFees: trade.fundingFees.plus(additionalFundingFees),
          leverage: trade.leverage,
          direction: trade.direction,
          additionalFees,
        }),
        exitConversionRate: conversion.rate,
        exitConversionRateAt: conversion.fetchedAt,
      };
    }
  }
}

export async function createTrade(input: unknown) {
  const { account } = await getUserTradingAccount();

  const validInput = validateTradeInput(input);

  const opening = await calculateOpeningPosition(
    validInput,
    account.currency
  );

  const closing =
    validInput.status === "CLOSED"
      ? await calculateClosedTrade(
          validInput,
          account.currency,
          opening.positionQuantity,
          opening.entryConversionRate
        )
      : null;

  const positionValue =
    validInput.marketType === "FOREX"
      ? null
      : new Decimal(String(validInput.positionValue));

  const lotSize =
    validInput.marketType === "FOREX"
      ? new Decimal(String(validInput.lotSize))
      : null;

  const fees =
    validInput.marketType === "CRYPTO_SPOT"
      ? new Decimal(String(validInput.fees))
      : new Decimal(0);

  const fundingFees =
    validInput.marketType === "CRYPTO_FUTURES"
      ? new Decimal(String(validInput.fundingFees))
      : new Decimal(0);

  const trade = await prisma.$transaction(async (tx) => {
    return tx.trade.create({
      data: {
        accountId: account.id,

        marketType: validInput.marketType,
        asset: validInput.asset,
        direction: validInput.direction,
        status: validInput.status,

        entryPrice: new Decimal(String(validInput.entryPrice)),
        exitPrice:
          validInput.status === "CLOSED"
            ? new Decimal(String(validInput.exitPrice))
            : null,

        quantity: opening.positionQuantity,
        positionValue,
        lotSize,

        leverage: validInput.leverage,
        marginUsed: opening.marginUsed,

        entryConversionRate: opening.entryConversionRate,
        entryConversionRateAt: opening.entryConversionRateAt,

        exitConversionRate:
          closing?.exitConversionRate ?? null,
        exitConversionRateAt:
          closing?.exitConversionRateAt ?? null,

        fees,
        fundingFees,

        grossPnL: closing?.result.grossPnL ?? null,
        totalFees: closing?.result.totalFees ?? null,
        netPnL: closing?.result.netPnL ?? null,
        returnPercentage:
          closing?.result.returnPercentage ?? null,

        strategy: validInput.strategy || null,
        notes: validInput.notes || null,

        entryDate: validInput.entryDate,
        exitDate:
          validInput.status === "CLOSED"
            ? validInput.exitDate
            : null,
        
        stopLoss: validInput.stopLoss
  ? new Decimal(String(validInput.stopLoss))
  : null,

takeProfit: validInput.takeProfit
  ? new Decimal(String(validInput.takeProfit))
  : null,

riskPercentage: validInput.riskPercentage
  ? new Decimal(String(validInput.riskPercentage))
  : null,
      },
    });
  });

  return trade;
}

export async function getTrades() {
  const { account } = await getUserTradingAccount();

  const trades = await prisma.trade.findMany({
    where: {
      accountId: account.id,
    },
    include: {
      images: true,
    },
    orderBy: {
      entryDate: "desc",
    },
  });

  return {
    trades,
    currency: account.currency,
  };
}

/**
 * Fetch a single trade that belongs to the signed-in user's account.
 *
 * Returns `null` (rather than throwing) when the trade does not exist or
 * belongs to someone else, so callers can render a not-found state without
 * leaking whether the ID exists.
 */
export async function getTradeById(tradeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be logged in to view this trade.");
  }

  const account = await prisma.tradingAccount.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      currency: true,
      timezone: true,
    },
  });

  if (!account) {
    return null;
  }

  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      accountId: account.id,
    },
    include: {
      images: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!trade) {
    return null;
  }

  return {
    trade,
    currency: account.currency,
    timezone: account.timezone,
  };
}


/**
 * Close an open trade by recording its exit details and calculating the final
 * realised performance.
 *
 * The original entry information and entry conversion snapshot are preserved.
 * The update is guarded by a conditional `updateMany` on `status: "OPEN"` so
 * concurrent or repeated close requests can only ever succeed once.
 */
export async function closeTrade(tradeId: string, input: unknown) {
  const { account } = await getUserTradingAccount();

  if (!tradeId || typeof tradeId !== "string") {
    throw new Error("A valid trade ID is required.");
  }

  const validInput = validateCloseInput(input);

  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      accountId: account.id,
    },
  });

  if (!trade) {
    throw new Error("Trade not found.");
  }

  if (trade.status === "CLOSED") {
    throw new Error("This trade is already closed.");
  }

  if (validInput.exitDate.getTime() < trade.entryDate.getTime()) {
    throw new Error("Exit date cannot be earlier than the entry date.");
  }

  const exitPrice = new Decimal(String(validInput.exitPrice));
  const additionalFees = new Decimal(String(validInput.additionalFees));
  const additionalFundingFees = new Decimal(
    String(validInput.additionalFundingFees)
  );

  const closing = await calculateClosingTrade(
    trade,
    exitPrice,
    account.currency,
    additionalFees,
    additionalFundingFees
  );

  return prisma.$transaction(async (tx) => {
    const updated = await tx.trade.updateMany({
      where: {
        id: trade.id,
        accountId: account.id,
        status: "OPEN",
      },
      data: {
        status: "CLOSED",
        exitPrice,
        exitDate: validInput.exitDate,
        exitConversionRate: closing.exitConversionRate,
        exitConversionRateAt: closing.exitConversionRateAt,

        // Accumulate any extra closing fees onto the recorded fees.
        fees: trade.fees.plus(additionalFees),
        fundingFees: trade.fundingFees.plus(additionalFundingFees),

        grossPnL: closing.result.grossPnL,
        totalFees: closing.result.totalFees,
        netPnL: closing.result.netPnL,
        returnPercentage: closing.result.returnPercentage,
      },
    });

    if (updated.count !== 1) {
      throw new Error("This trade is already closed.");
    }

    return tx.trade.findUniqueOrThrow({
      where: { id: trade.id },
    });
  });
}

/**
 * Update an existing trade in place.
 *
 * Entry-side values and the entry conversion snapshot are preserved unless the
 * entry information actually changes, in which case the snapshot is recalculated
 * through the currency service. Closed trades have their full performance
 * recalculated through the market-specific calculation engine whenever a
 * calculation-relevant field changes. The trade is never duplicated and the
 * status is pinned to its stored value so it cannot be changed from this flow.
 */
export async function updateTrade(
  tradeId: string,
  input: Record<string, unknown>,
  removeImageIds: string[] = [],
  newImages: File[] = []
) {
  const { account, userId } = await getUserTradingAccount();

  if (!tradeId || typeof tradeId !== "string") {
    throw new Error("A valid trade ID is required.");
  }

  if (!input || typeof input !== "object") {
    throw new Error("Trade details are required.");
  }

  const existing = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      accountId: account.id,
    },
    include: {
      images: {
        select: { id: true, storagePath: true },
      },
    },
  });

  if (!existing) {
    throw new Error("Trade not found.");
  }

  // Pin the status to the stored value so it can never be changed here.
  const validInput = validateTradeInput({
    ...input,
    status: existing.status,
  });

  // ---- Screenshot validation -------------------------------------------
  if (!Array.isArray(removeImageIds)) {
    throw new Error("Invalid image selection.");
  }

  const uniqueRemoveIds = Array.from(new Set(removeImageIds));
  const existingImageIds = new Set(
    existing.images.map((image) => image.id)
  );

  for (const imageId of uniqueRemoveIds) {
    if (typeof imageId !== "string" || !existingImageIds.has(imageId)) {
      throw new Error("One or more selected screenshots no longer exist.");
    }
  }

  const imageFiles = Array.isArray(newImages) ? newImages : [];

  validateTradeImageFiles(imageFiles);

  const remainingImages =
    existing.images.length - uniqueRemoveIds.length;

  if (remainingImages + imageFiles.length > MAX_TRADE_IMAGES) {
    throw new Error("A trade can have a maximum of 5 images.");
  }

  // ---- Entry-side values -----------------------------------------------
  const entryPrice = new Decimal(String(validInput.entryPrice));

  const lotSize =
    validInput.marketType === "FOREX"
      ? new Decimal(String(validInput.lotSize))
      : null;

  const positionValue =
    validInput.marketType === "FOREX"
      ? null
      : new Decimal(String(validInput.positionValue));

  const entryChanged =
    existing.marketType !== validInput.marketType ||
    existing.asset.trim().toUpperCase() !==
      validInput.asset.trim().toUpperCase() ||
    !existing.entryPrice.equals(entryPrice) ||
    existing.leverage !== validInput.leverage ||
    !decimalsEqual(existing.lotSize, lotSize) ||
    !decimalsEqual(existing.positionValue, positionValue);

  let quantity = existing.quantity;
  let marginUsed = existing.marginUsed;
  let entryConversionRate = existing.entryConversionRate;
  let entryConversionRateAt = existing.entryConversionRateAt;

  if (entryChanged) {
    // A valid recalculation through the currency conversion service.
    const opening = await calculateOpeningPosition(
      validInput,
      account.currency
    );

    quantity = opening.positionQuantity;
    marginUsed = opening.marginUsed;
    entryConversionRate = opening.entryConversionRate;
    entryConversionRateAt = opening.entryConversionRateAt;
  }

  // ---- Fees ------------------------------------------------------------
  let fees: Decimal;
  let fundingFees: Decimal;

  if (validInput.marketType === "CRYPTO_SPOT") {
    fees = new Decimal(String(validInput.fees));
    fundingFees = new Decimal(0);
  } else if (validInput.marketType === "CRYPTO_FUTURES") {
    fees =
      existing.marketType === "CRYPTO_FUTURES"
        ? existing.fees
        : new Decimal(0);
    fundingFees = new Decimal(String(validInput.fundingFees));
  } else {
    // Forex commission is automatic; the fees column holds any extra fees.
    fees =
      existing.marketType === "FOREX" ? existing.fees : new Decimal(0);
    fundingFees = new Decimal(0);
  }

  // Extra fees are added on top of the automatic commission/trading fees.
  const additionalFees =
    validInput.marketType === "CRYPTO_SPOT" ? new Decimal(0) : fees;

  // ---- Exit-side values & performance ----------------------------------
  const isClosed = validInput.status === "CLOSED";

  const exitPrice =
    isClosed && validInput.exitPrice !== undefined
      ? new Decimal(String(validInput.exitPrice))
      : null;

  const exitDate = isClosed ? validInput.exitDate ?? null : null;

  const performanceChanged =
    entryChanged ||
    existing.direction !== validInput.direction ||
    !decimalsEqual(existing.fees, fees) ||
    !decimalsEqual(existing.fundingFees, fundingFees) ||
    !decimalsEqual(existing.exitPrice, exitPrice) ||
    !datesEqual(existing.exitDate, exitDate);

  let grossPnL = existing.grossPnL;
  let totalFees = existing.totalFees;
  let netPnL = existing.netPnL;
  let returnPercentage = existing.returnPercentage;
  let exitConversionRate = existing.exitConversionRate;
  let exitConversionRateAt = existing.exitConversionRateAt;

  if (isClosed && performanceChanged) {
    if (!entryConversionRate) {
      throw new Error(
        "This trade is missing its entry conversion rate and cannot be updated."
      );
    }

    const closing = await calculateClosedTrade(
      validInput,
      account.currency,
      quantity,
      entryConversionRate,
      additionalFees
    );

    grossPnL = closing.result.grossPnL;
    totalFees = closing.result.totalFees;
    netPnL = closing.result.netPnL;
    returnPercentage = closing.result.returnPercentage;
    exitConversionRate = closing.exitConversionRate;
    exitConversionRateAt = closing.exitConversionRateAt;
  }

  // ---- Persist (trade + screenshot records in one transaction) ----------
  let uploadedPaths: string[] = [];

  try {
    if (imageFiles.length > 0) {
      uploadedPaths = await uploadTradeImageObjects(
        userId,
        tradeId,
        imageFiles
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.trade.update({
        where: { id: tradeId, accountId: account.id },
        data: {
          marketType: validInput.marketType,
          asset: validInput.asset,
          direction: validInput.direction,

          entryPrice,
          entryDate: validInput.entryDate,
          leverage: validInput.leverage,

          quantity,
          positionValue,
          lotSize,
          marginUsed,

          entryConversionRate,
          entryConversionRateAt,

          fees,
          fundingFees,

          stopLoss: validInput.stopLoss
            ? new Decimal(String(validInput.stopLoss))
            : null,
          takeProfit: validInput.takeProfit
            ? new Decimal(String(validInput.takeProfit))
            : null,
          riskPercentage: validInput.riskPercentage
            ? new Decimal(String(validInput.riskPercentage))
            : null,

          strategy: validInput.strategy || null,
          notes: validInput.notes || null,

          exitPrice,
          exitDate,
          exitConversionRate,
          exitConversionRateAt,

          grossPnL,
          totalFees,
          netPnL,
          returnPercentage,
        },
      });

      if (uniqueRemoveIds.length > 0) {
        await tx.tradeImage.deleteMany({
          where: {
            tradeId,
            id: { in: uniqueRemoveIds },
          },
        });
      }

      if (uploadedPaths.length > 0) {
        await tx.tradeImage.createMany({
          data: uploadedPaths.map((path) => ({
            tradeId,
            storagePath: path,
          })),
        });
      }

      return tx.trade.findUniqueOrThrow({
        where: { id: tradeId },
        include: {
          images: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    // Storage cleanup runs only after the database is consistent.
    if (uniqueRemoveIds.length > 0) {
      const removedPaths = existing.images
        .filter((image) => uniqueRemoveIds.includes(image.id))
        .map((image) => image.storagePath);

      await deleteTradeImageObjects(removedPaths).catch((error) => {
        console.error("Trade image cleanup error:", error);
      });
    }

    return updated;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await deleteTradeImageObjects(uploadedPaths).catch(() => {});
    }

    throw error;
  }
}

export async function deleteTrade(tradeId: string) {
  const { account } = await getUserTradingAccount();

  if (!tradeId || typeof tradeId !== "string") {
    throw new Error("A valid trade ID is required.");
  }

  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      accountId: account.id,
    },
    include: {
      images: {
        select: {
          storagePath: true,
        },
      },
    },
  });

  if (!trade) {
    throw new Error("Trade not found.");
  }

  // Remove uploaded screenshots from Supabase Storage.
  if (trade.images.length > 0) {
    const supabase = await createClient();

    const paths = trade.images.map((image) => image.storagePath);

    const { error } = await supabase.storage
      .from("trade-images")
      .remove(paths);

    if (error) {
      console.error("Trade image deletion error:", error);
      throw new Error("Unable to delete trade images. Trade was not deleted.");
    }
  }

  // Prisma cascade deletes the associated TradeImage records.
  await prisma.trade.delete({
    where: {
      id: trade.id,
      accountId: account.id,
    },
  });

  return { success: true };
}
