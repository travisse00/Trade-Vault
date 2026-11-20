import { z } from "zod";

const baseTradeSchema = z.object({
  asset: z.string().trim().min(1, "Asset is required."),
  direction: z.enum(["LONG", "SHORT"]),
  status: z.enum(["OPEN", "CLOSED"]),
  entryPrice: z.coerce.number().positive("Entry price must be greater than zero."),
  exitPrice: z.coerce.number().positive().optional(),
  entryDate: z.coerce.date(),
  exitDate: z.coerce.date().optional(),
  leverage: z.coerce.number().int().min(1).default(1),
  strategy: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  stopLoss: z.coerce.number().positive().optional(),
takeProfit: z.coerce.number().positive().optional(),
riskPercentage: z.coerce.number().positive().optional(),
});

const tradeStatusSchema = baseTradeSchema.superRefine(
  (trade, ctx) => {
    if (trade.status === "CLOSED" && !trade.exitPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["exitPrice"],
        message: "Exit price is required for closed trades.",
      });
    }

    if (trade.status === "CLOSED" && !trade.exitDate) {
      ctx.addIssue({
        code: "custom",
        path: ["exitDate"],
        message: "Exit date is required for closed trades.",
      });
    }

    if (trade.status === "OPEN" && trade.exitPrice !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["exitPrice"],
        message: "Open trades cannot have an exit price.",
      });
    }

    if (trade.status === "OPEN" && trade.exitDate !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["exitDate"],
        message: "Open trades cannot have an exit date.",
      });
    }
  }
);

export const forexTradeSchema = tradeStatusSchema.safeExtend({
  marketType: z.literal("FOREX"),
  lotSize: z.coerce.number().positive("Lot size must be greater than zero."),
});

export const cryptoSpotTradeSchema = tradeStatusSchema.safeExtend({
  marketType: z.literal("CRYPTO_SPOT"),
  direction: z.literal("LONG"),
  positionValue: z.coerce.number().positive(
    "Position value must be greater than zero."
  ),
  fees: z.coerce.number().min(0).default(0),
});

export const cryptoFuturesTradeSchema = tradeStatusSchema.safeExtend({
  marketType: z.literal("CRYPTO_FUTURES"),
  positionValue: z.coerce.number().positive(
    "Position value must be greater than zero."
  ),
  fundingFees: z.coerce.number().min(0).default(0),
});

export const tradeSchema = z.discriminatedUnion("marketType", [
  forexTradeSchema,
  cryptoSpotTradeSchema,
  cryptoFuturesTradeSchema,
]);

export type TradeInput = z.infer<typeof tradeSchema>;

/**
 * Validation for closing an existing open trade. Entry-side values come from
 * the stored trade, so only the exit details and any extra fees are supplied.
 */
export const closeTradeSchema = z.object({
  exitPrice: z.coerce
    .number()
    .finite("Exit price must be a valid number.")
    .positive("Exit price must be greater than zero."),

  exitDate: z.coerce.date(),

  additionalFees: z.coerce
    .number()
    .finite("Additional fees must be a valid number.")
    .min(0, "Additional fees cannot be negative.")
    .default(0),

  additionalFundingFees: z.coerce
    .number()
    .finite("Additional funding fees must be a valid number.")
    .min(0, "Additional funding fees cannot be negative.")
    .default(0),
});

export type CloseTradeInput = z.infer<typeof closeTradeSchema>;