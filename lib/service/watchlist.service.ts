import "server-only";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAccount } from "@/lib/service/account.service";
import {
  createWatchlistItemSchema,
  normalizeWatchlistSymbol,
  updateWatchlistItemSchema,
} from "@/lib/validation/watchlist";

function getWatchlistDelegate() {
  const delegate = (prisma as unknown as { watchlistItem?: unknown }).watchlistItem;
  if (!delegate) {
    throw new Error(
      "Watchlist is not available in the current server process. Run `npx prisma generate` and restart the dev server."
    );
  }
  return prisma.watchlistItem;
}

function isMissingWatchlistTableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function throwIfMissingWatchlistTable(error: unknown): never | void {
  if (isMissingWatchlistTableError(error)) {
    throw new Error(
      "Watchlist database table is missing. Apply the latest Prisma migration (`20261120120000_add_watchlist_items`)."
    );
  }
}

function toSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mapItem(item: {
  id: string;
  name: string;
  symbol: string;
  category: string;
  notes: string | null;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    category: item.category,
    notes: item.notes,
    isFavorite: item.isFavorite,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

async function assertNoDuplicate(args: {
  accountId: string;
  category: "FOREX" | "CRYPTO" | "STOCKS" | "INDICES" | "COMMODITIES";
  normalizedSymbol: string;
  excludeId?: string;
}) {
  const watchlistItem = getWatchlistDelegate();
  try {
    const existing = await watchlistItem.findFirst({
      where: {
        accountId: args.accountId,
        category: args.category,
        normalizedSymbol: args.normalizedSymbol,
        ...(args.excludeId ? { id: { not: args.excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new Error("This asset is already in your watchlist.");
    }
  } catch (error) {
    throwIfMissingWatchlistTable(error);
    throw error;
  }
}

export async function getWatchlistItems() {
  const { account } = await getAuthenticatedAccount();
  const watchlistItem = getWatchlistDelegate();

  try {
    const items = await watchlistItem.findMany({
      where: { accountId: account.id },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return toSerializable(items.map(mapItem));
  } catch (error) {
    if (isMissingWatchlistTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function createWatchlistItem(input: unknown) {
  const parsed = createWatchlistItemSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid watchlist item.");
  }

  const { account } = await getAuthenticatedAccount();
  const data = parsed.data;
  const normalizedSymbol = normalizeWatchlistSymbol(data.symbol);

  await assertNoDuplicate({
    accountId: account.id,
    category: data.category,
    normalizedSymbol,
  });

  try {
    const watchlistItem = getWatchlistDelegate();
    const created = await watchlistItem.create({
      data: {
        accountId: account.id,
        name: data.name,
        symbol: data.symbol.trim(),
        normalizedSymbol,
        category: data.category,
        notes: data.notes,
        isFavorite: data.isFavorite ?? false,
      },
    });

    return toSerializable(mapItem(created));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("This asset is already in your watchlist.");
    }
    if (isMissingWatchlistTableError(error)) {
      throw new Error(
        "Watchlist is not available yet. Please run the latest database migrations."
      );
    }
    throw error;
  }
}

export async function updateWatchlistItem(itemId: string, input: unknown) {
  if (!itemId || typeof itemId !== "string") {
    throw new Error("A valid watchlist item ID is required.");
  }

  const parsed = updateWatchlistItemSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid watchlist update.");
  }

  const { account } = await getAuthenticatedAccount();
  const watchlistItem = getWatchlistDelegate();

  let existing:
    | {
        id: string;
        accountId: string;
        name: string;
        symbol: string;
        normalizedSymbol: string;
        category: "FOREX" | "CRYPTO" | "STOCKS" | "INDICES" | "COMMODITIES";
        notes: string | null;
        isFavorite: boolean;
        createdAt: Date;
        updatedAt: Date;
      }
    | null = null;

  try {
    existing = await watchlistItem.findFirst({
      where: { id: itemId, accountId: account.id },
    });
  } catch (error) {
    throwIfMissingWatchlistTable(error);
    throw error;
  }

  if (!existing) {
    throw new Error("Watchlist item not found.");
  }

  const data = parsed.data;

  const nextCategory = data.category ?? existing.category;
  const nextSymbolDisplay =
    typeof data.symbol === "string" ? data.symbol.trim() : existing.symbol;
  const nextNormalizedSymbol =
    typeof data.symbol === "string"
      ? normalizeWatchlistSymbol(data.symbol)
      : existing.normalizedSymbol;

  if (
    nextCategory !== existing.category ||
    nextNormalizedSymbol !== existing.normalizedSymbol
  ) {
    await assertNoDuplicate({
      accountId: account.id,
      category: nextCategory,
      normalizedSymbol: nextNormalizedSymbol,
      excludeId: existing.id,
    });
  }

  const updateData: Prisma.WatchlistItemUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.symbol !== undefined) {
    updateData.symbol = nextSymbolDisplay;
    updateData.normalizedSymbol = nextNormalizedSymbol;
  }
  if (data.category !== undefined) updateData.category = data.category;
  if (data.notes !== undefined) {
    updateData.notes = data.notes === null ? null : data.notes;
  }
  if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;

  try {
    const updated = await watchlistItem.update({
      where: { id: existing.id },
      data: updateData,
    });

    return toSerializable(mapItem(updated));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("This asset is already in your watchlist.");
    }
    if (isMissingWatchlistTableError(error)) {
      throw new Error(
        "Watchlist is not available yet. Please run the latest database migrations."
      );
    }
    throw error;
  }
}

export async function deleteWatchlistItem(itemId: string) {
  if (!itemId || typeof itemId !== "string") {
    throw new Error("A valid watchlist item ID is required.");
  }

  const { account } = await getAuthenticatedAccount();
  const watchlistItem = getWatchlistDelegate();

  let existing: { id: string } | null = null;
  try {
    existing = await watchlistItem.findFirst({
      where: { id: itemId, accountId: account.id },
      select: { id: true },
    });
  } catch (error) {
    throwIfMissingWatchlistTable(error);
    throw error;
  }

  if (!existing) {
    throw new Error("Watchlist item not found.");
  }

  try {
    await watchlistItem.delete({
      where: { id: existing.id },
    });

    return { id: existing.id };
  } catch (error) {
    if (isMissingWatchlistTableError(error)) {
      throw new Error(
        "Watchlist is not available yet. Please run the latest database migrations."
      );
    }
    throw error;
  }
}
