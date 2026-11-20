import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mockGetAuthenticatedAccount = vi.fn();

vi.mock("@/lib/service/account.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/service/account.service")>(
    "@/lib/service/account.service"
  );
  return {
    ...actual,
    getAuthenticatedAccount: (...args: unknown[]) => mockGetAuthenticatedAccount(...args),
  };
});

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    watchlistItem: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

import {
  createWatchlistItem,
  deleteWatchlistItem,
  getWatchlistItems,
  updateWatchlistItem,
} from "./watchlist.service";

function makeDbItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "wl_1",
    accountId: "acct-1",
    name: "Euro / US Dollar",
    symbol: "EURUSD",
    normalizedSymbol: "EURUSD",
    category: "FOREX",
    notes: "Track London session",
    isFavorite: false,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    ...overrides,
  };
}

describe("watchlist.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedAccount.mockReset();
    mockFindMany.mockReset();
    mockFindFirst.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();

    mockGetAuthenticatedAccount.mockResolvedValue({
      account: { id: "acct-1", currency: "USD" },
      userId: "user-1",
    });
  });

  it("lists watchlist items scoped to the authenticated account (isolation) and returns empty state", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const empty = await getWatchlistItems();
    expect(empty).toEqual([]);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: "acct-1" },
      })
    );

    mockFindMany.mockResolvedValueOnce([makeDbItem(), makeDbItem({ id: "wl_2", name: "Bitcoin", symbol: "BTC", normalizedSymbol: "BTC", category: "CRYPTO", isFavorite: true })]);
    const items = await getWatchlistItems();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: "wl_1", category: "FOREX", isFavorite: false });
    expect(typeof items[0].createdAt).toBe("string");
  });

  it("adds an asset with normalized symbol and prevents duplicates within the same account/category", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(makeDbItem({ symbol: "EURUSD", normalizedSymbol: "EURUSD" }));

    const created = await createWatchlistItem({
      name: "Euro / US Dollar",
      symbol: " eurusd ",
      category: "FOREX",
      notes: "Note",
      isFavorite: false,
    });

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: "acct-1",
          category: "FOREX",
          normalizedSymbol: "EURUSD",
        }),
      })
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: "acct-1",
          symbol: "eurusd",
          normalizedSymbol: "EURUSD",
          category: "FOREX",
        }),
      })
    );
    expect(created).toMatchObject({ id: "wl_1", symbol: "EURUSD" });
    expect(created).not.toHaveProperty("normalizedSymbol");

    mockFindFirst.mockResolvedValueOnce({ id: "wl_existing" });
    await expect(
      createWatchlistItem({ name: "Duplicate", symbol: "EURUSD", category: "FOREX" })
    ).rejects.toThrow(/already in your watchlist/i);

    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.1",
      } as any)
    );
    await expect(
      createWatchlistItem({ name: "Race", symbol: "EURUSD", category: "FOREX" })
    ).rejects.toThrow(/already in your watchlist/i);
  });

  it("edits an asset and toggles favourite, enforcing ownership/isolation", async () => {
    mockFindFirst
      .mockResolvedValueOnce(makeDbItem()) // existing owned item
      .mockResolvedValueOnce(null); // duplicate check for changed symbol/category
    mockUpdate.mockResolvedValueOnce(
      makeDbItem({ symbol: "EURUSD", normalizedSymbol: "EURUSD", notes: "Updated", isFavorite: true })
    );

    const updated = await updateWatchlistItem("wl_1", {
      notes: "Updated",
      isFavorite: true,
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wl_1" },
        data: expect.objectContaining({ notes: "Updated", isFavorite: true }),
      })
    );
    expect(updated).toMatchObject({ id: "wl_1", notes: "Updated", isFavorite: true });

    // Not owned by authenticated account / not found
    mockFindFirst.mockResolvedValueOnce(null);
    await expect(updateWatchlistItem("wl_other", { isFavorite: false })).rejects.toThrow(/not found/i);
  });

  it("prevents duplicate on edit when changing to an existing symbol/category", async () => {
    mockFindFirst
      .mockResolvedValueOnce(makeDbItem({ category: "FOREX", normalizedSymbol: "EURUSD" }))
      .mockResolvedValueOnce({ id: "wl_existing" }); // duplicate target

    await expect(
      updateWatchlistItem("wl_1", { symbol: "GBPUSD", category: "FOREX" })
    ).rejects.toThrow(/already in your watchlist/i);
  });

  it("deletes an asset with ownership enforcement and returns empty-state-safe result after removal", async () => {
    mockFindFirst.mockResolvedValueOnce({ id: "wl_1" });
    mockDelete.mockResolvedValueOnce({ id: "wl_1" });

    const result = await deleteWatchlistItem("wl_1");
    expect(result).toEqual({ id: "wl_1" });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "wl_1" } });

    mockFindFirst.mockResolvedValueOnce(null);
    await expect(deleteWatchlistItem("wl_missing")).rejects.toThrow(/not found/i);

    mockFindMany.mockResolvedValueOnce([]);
    const after = await getWatchlistItems();
    expect(after).toEqual([]);
  });

  it("allows same symbol in a different category (category-scoped duplicate prevention)", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce(
      makeDbItem({ id: "wl_crypto", name: "USD Coin", symbol: "USD", normalizedSymbol: "USD", category: "CRYPTO" })
    );

    const created = await createWatchlistItem({
      name: "USD Coin",
      symbol: "usd",
      category: "CRYPTO",
    });

    expect(created.category).toBe("CRYPTO");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountId: "acct-1", category: "CRYPTO", normalizedSymbol: "USD" }),
      })
    );
  });
});
