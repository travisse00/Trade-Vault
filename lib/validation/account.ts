import { z } from "zod";

/**
 * Validation for recording a deposit or withdrawal against the trading account.
 * The amount must be a finite positive number and the date a valid date.
 */
export const accountTransactionSchema = z.object({
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z.coerce
    .number()
    .finite("Amount must be a valid number.")
    .positive("Amount must be greater than zero."),
  date: z.coerce.date(),
  note: z.string().trim().max(200, "Description is too long.").optional(),
});

export type AccountTransactionInput = z.infer<typeof accountTransactionSchema>;
