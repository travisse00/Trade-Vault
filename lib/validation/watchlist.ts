import { z } from "zod";

export const WATCHLIST_CATEGORIES = [
  "FOREX",
  "CRYPTO",
  "STOCKS",
  "INDICES",
  "COMMODITIES",
] as const;

export type WatchlistCategoryValue = (typeof WATCHLIST_CATEGORIES)[number];

export function normalizeWatchlistSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

const watchlistCategorySchema = z.enum(WATCHLIST_CATEGORIES);

const notesSchema = z
  .string()
  .trim()
  .max(500, "Notes must be 500 characters or fewer.")
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value === "" ? undefined : value;
  });

export const createWatchlistItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Asset name is required.")
    .max(120, "Asset name must be 120 characters or fewer."),
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol or ticker is required.")
    .max(32, "Symbol or ticker must be 32 characters or fewer."),
  category: watchlistCategorySchema,
  notes: notesSchema,
  isFavorite: z.boolean().optional(),
});

export const updateWatchlistItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Asset name is required.")
      .max(120, "Asset name must be 120 characters or fewer.")
      .optional(),
    symbol: z
      .string()
      .trim()
      .min(1, "Symbol or ticker is required.")
      .max(32, "Symbol or ticker must be 32 characters or fewer.")
      .optional(),
    category: watchlistCategorySchema.optional(),
    notes: notesSchema.nullable().optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export type CreateWatchlistItemInput = z.infer<typeof createWatchlistItemSchema>;
export type UpdateWatchlistItemInput = z.infer<typeof updateWatchlistItemSchema>;
