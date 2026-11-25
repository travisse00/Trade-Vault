import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const {
  mockGetUser,
  mockAccountFindUnique,
  mockAccountUpdate,
  mockTradeFindFirst,
  mockTradeCreate,
  mockTransaction,
  mockGetCurrencyRate,
  mockValidateTradeImageFiles,
  mockUploadTradeImageObjects,
  mockDeleteTradeImageObjects,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAccountFindUnique: vi.fn(),
  mockAccountUpdate: vi.fn(),
  mockTradeFindFirst: vi.fn(),
  mockTradeCreate: vi.fn(),
  mockTransaction: vi.fn(),
  mockGetCurrencyRate: vi.fn(),
  mockValidateTradeImageFiles: vi.fn(),
  mockUploadTradeImageObjects: vi.fn(),
  mockDeleteTradeImageObjects: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradingAccount: {
      findUnique: mockAccountFindUnique,
      update: mockAccountUpdate,
    },
    trade: { findFirst: mockTradeFindFirst, create: mockTradeCreate },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/service/currency-rate.service", () => ({
  getCurrencyRate: mockGetCurrencyRate,
}));

vi.mock("@/lib/service/trade-image.service", () => ({
  MAX_TRADE_IMAGES: 5,
  validateTradeImageFiles: mockValidateTradeImageFiles,
  uploadTradeImageObjects: mockUploadTradeImageObjects,
  deleteTradeImageObjects: mockDeleteTradeImageObjects,
}));

import { createTrade, updateTrade } from "./trade.service";

function makeExisting(overrides: Record<string, unknown> = {}) {
  return {
    id: "trade_1",
    accountId: "acct_1",
    marketType: "FOREX",
    asset: "EUR/USD",
    direction: "LONG",
    status: "OPEN",
    entryPrice: new Decimal("1.1"),
    exitPrice: null,
    entryDate: new Date("2026-01-01T10:00:00.000Z"),
    exitDate: null,
    leverage: 10,
    lotSize: new Decimal("0.1"),
    positionValue: null,
    quantity: new Decimal("10000"),
    marginUsed: new Decimal("1100"),
    entryConversionRate: new Decimal("1"),
    entryConversionRateAt: new Date("2026-01-01T10:00:00.000Z"),
    fees: new Decimal("0"),
    fundingFees: new Decimal("0"),
    grossPnL: null,
    totalFees: null,
    netPnL: null,
    returnPercentage: null,
    exitConversionRate: null,
    exitConversionRateAt: null,
    stopLoss: null,
    takeProfit: null,
    riskPercentage: null,
    strategy: null,
    notes: null,
    images: [] as Array<{ id: string; storagePath: string }>,
    ...overrides,
  };
}

const openForexInput = {
  marketType: "FOREX",
  asset: "EUR/USD",
  direction: "LONG",
  entryPrice: 1.1,
  entryDate: "2026-01-01T10:00:00.000Z",
  leverage: 10,
  lotSize: 0.1,
};

function setupTransaction() {
  const update = vi.fn().mockResolvedValue({});
  const findUniqueOrThrow = vi
    .fn()
    .mockResolvedValue({ id: "trade_1", images: [] });
  const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
  const createMany = vi.fn().mockResolvedValue({ count: 0 });

  const tx = {
    trade: { update, findUniqueOrThrow },
    tradeImage: { deleteMany, createMany },
  };

  mockTransaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx)
  );

  return { tx, update, findUniqueOrThrow, deleteMany, createMany };
}

function lastUpdateData(update: ReturnType<typeof vi.fn>) {
  return update.mock.calls[0][0].data as Record<string, unknown>;
}

describe("updateTrade", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user_1" } },
      error: null,
    });
    mockAccountFindUnique.mockResolvedValue({
      id: "acct_1",
      currency: "USD",
    });
  });

  it("updates in place without creating a duplicate and pins the status", async () => {
    mockTradeFindFirst.mockResolvedValue(makeExisting());
    const { update } = setupTransaction();

    await updateTrade("trade_1", {
      ...openForexInput,
      status: "CLOSED",
    });

    expect(mockTradeCreate).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);

    const data = lastUpdateData(update);

    expect(data).not.toHaveProperty("status");
    expect(data.exitPrice).toBeNull();
    expect(data.exitDate).toBeNull();
  });

  it("preserves the entry conversion snapshot when entry values are unchanged", async () => {
    mockTradeFindFirst.mockResolvedValue(makeExisting());
    const { update } = setupTransaction();

    await updateTrade("trade_1", openForexInput);

    const data = lastUpdateData(update);

    expect(mockGetCurrencyRate).not.toHaveBeenCalled();
    expect((data.entryConversionRate as Decimal).toString()).toBe("1");
    expect((data.quantity as Decimal).toString()).toBe("10000");
    expect((data.marginUsed as Decimal).toString()).toBe("1100");
  });

  it("recalculates the entry snapshot when entry information changes", async () => {
    mockTradeFindFirst.mockResolvedValue(makeExisting());
    const { update } = setupTransaction();

    mockGetCurrencyRate.mockResolvedValue({
      rate: new Decimal("1.5"),
      fetchedAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    await updateTrade("trade_1", { ...openForexInput, entryPrice: 1.2 });

    const data = lastUpdateData(update);

    expect(mockGetCurrencyRate).toHaveBeenCalledTimes(1);
    expect((data.entryConversionRate as Decimal).toString()).toBe("1.5");
    expect((data.quantity as Decimal).toString()).toBe("10000");
    expect((data.marginUsed as Decimal).toString()).toBe("1800");
  });

  it("recalculates closed performance when exit information changes", async () => {
    mockTradeFindFirst.mockResolvedValue(
      makeExisting({
        status: "CLOSED",
        exitPrice: new Decimal("1.15"),
        exitDate: new Date("2026-01-02T10:00:00.000Z"),
        grossPnL: new Decimal("500"),
        totalFees: new Decimal("0.7"),
        netPnL: new Decimal("499.3"),
        returnPercentage: new Decimal("45.39"),
        exitConversionRate: new Decimal("1"),
        exitConversionRateAt: new Date("2026-01-02T10:00:00.000Z"),
      })
    );
    const { update } = setupTransaction();

    mockGetCurrencyRate.mockResolvedValue({
      rate: new Decimal("1"),
      fetchedAt: new Date("2026-01-02T10:00:00.000Z"),
    });

    await updateTrade("trade_1", {
      ...openForexInput,
      exitPrice: 1.2,
      exitDate: "2026-01-02T10:00:00.000Z",
    });

    const data = lastUpdateData(update);

    expect((data.grossPnL as Decimal).toString()).toBe("1000");
    expect((data.totalFees as Decimal).toString()).toBe("0.7");
    expect((data.netPnL as Decimal).toString()).toBe("999.3");
  });

  it("keeps the stored performance when nothing calculation-relevant changes", async () => {
    mockTradeFindFirst.mockResolvedValue(
      makeExisting({
        status: "CLOSED",
        exitPrice: new Decimal("1.2"),
        exitDate: new Date("2026-01-02T10:00:00.000Z"),
        grossPnL: new Decimal("1000"),
        totalFees: new Decimal("0.7"),
        netPnL: new Decimal("999.3"),
        returnPercentage: new Decimal("90.84545454545454545454545455"),
        exitConversionRate: new Decimal("1"),
        exitConversionRateAt: new Date("2026-01-02T10:00:00.000Z"),
      })
    );
    const { update } = setupTransaction();

    await updateTrade("trade_1", {
      ...openForexInput,
      exitPrice: 1.2,
      exitDate: "2026-01-02T10:00:00.000Z",
      strategy: "Breakout",
    });

    const data = lastUpdateData(update);

    expect(mockGetCurrencyRate).not.toHaveBeenCalled();
    expect((data.netPnL as Decimal).toString()).toBe("999.3");
    expect(data.strategy).toBe("Breakout");
  });

  it("rejects removing a screenshot that does not belong to the trade", async () => {
    mockTradeFindFirst.mockResolvedValue(
      makeExisting({
        images: [{ id: "img_1", storagePath: "user_1/trade_1/a.png" }],
      })
    );
    setupTransaction();

    await expect(
      updateTrade("trade_1", openForexInput, ["img_missing"])
    ).rejects.toThrow("no longer exist");

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("enforces the five-screenshot limit", async () => {
    const images = Array.from({ length: 5 }, (_, index) => ({
      id: `img_${index}`,
      storagePath: `user_1/trade_1/${index}.png`,
    }));

    mockTradeFindFirst.mockResolvedValue(makeExisting({ images }));
    setupTransaction();

    const file = new File(["x"], "extra.png", { type: "image/png" });

    await expect(
      updateTrade("trade_1", openForexInput, [], [file])
    ).rejects.toThrow("maximum of 5 images");

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("applies screenshot removals and additions inside the transaction", async () => {
    mockTradeFindFirst.mockResolvedValue(
      makeExisting({
        images: [
          { id: "img_1", storagePath: "user_1/trade_1/a.png" },
          { id: "img_2", storagePath: "user_1/trade_1/b.png" },
        ],
      })
    );

    const { deleteMany, createMany } = setupTransaction();

    mockUploadTradeImageObjects.mockResolvedValue([
      "user_1/trade_1/new.png",
    ]);
    mockDeleteTradeImageObjects.mockResolvedValue(undefined);

    const file = new File(["x"], "new.png", { type: "image/png" });

    await updateTrade("trade_1", openForexInput, ["img_1"], [file]);

    expect(mockUploadTradeImageObjects).toHaveBeenCalledWith(
      "user_1",
      "trade_1",
      [file]
    );

    expect(deleteMany).toHaveBeenCalledWith({
      where: { tradeId: "trade_1", id: { in: ["img_1"] } },
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [{ tradeId: "trade_1", storagePath: "user_1/trade_1/new.png" }],
    });

    expect(mockDeleteTradeImageObjects).toHaveBeenCalledWith([
      "user_1/trade_1/a.png",
    ]);
  });

  it("cleans up uploaded objects when the transaction fails", async () => {
    mockTradeFindFirst.mockResolvedValue(makeExisting());

    mockUploadTradeImageObjects.mockResolvedValue([
      "user_1/trade_1/new.png",
    ]);
    mockDeleteTradeImageObjects.mockResolvedValue(undefined);
    mockTransaction.mockRejectedValue(new Error("database unavailable"));

    const file = new File(["x"], "new.png", { type: "image/png" });

    await expect(
      updateTrade("trade_1", openForexInput, [], [file])
    ).rejects.toThrow("database unavailable");

    expect(mockDeleteTradeImageObjects).toHaveBeenCalledWith([
      "user_1/trade_1/new.png",
    ]);
  });
});

describe("createTrade from a duplicated draft", () => {
  const snapshotAt = new Date("2026-11-25T10:30:00.000Z");
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user_1" } },
      error: null,
    });
    mockAccountFindUnique.mockResolvedValue({
      id: "acct_1",
      currency: "USD",
    });
    mockGetCurrencyRate.mockResolvedValue({
      rate: new Decimal("1.25"),
      fetchedAt: snapshotAt,
    });

    create = vi.fn().mockImplementation(async ({ data }) => ({
      id: "new_trade_id",
      ...data,
    }));

    mockTransaction.mockImplementation(
      async (callback: (client: { trade: { create: typeof create } }) => unknown) =>
        callback({ trade: { create } })
    );
  });

  it("creates a separate OPEN trade with fresh snapshots and no copied results", async () => {
    const duplicatedPayload = {
      marketType: "FOREX",
      asset: "EUR/USD",
      direction: "LONG",
      status: "OPEN",
      entryPrice: 1.1,
      entryDate: "2026-11-25T10:30:00.000Z",
      lotSize: 0.1,
      leverage: 100,
      stopLoss: 1.08,
      takeProfit: 1.15,
      riskPercentage: 2,
      strategy: "SMC",
      notes: "Original setup notes",
    };

    await createTrade(duplicatedPayload);

    expect(create).toHaveBeenCalledTimes(1);
    expect(mockTradeFindFirst).not.toHaveBeenCalled();
    expect(mockGetCurrencyRate).toHaveBeenCalledTimes(1);

    const data = create.mock.calls[0][0].data as Record<string, unknown>;

    expect(data.accountId).toBe("acct_1");
    expect(data.status).toBe("OPEN");
    // The database generates a new ID; no ID from the source is submitted.
    expect(data.id).toBeUndefined();
    expect(data.exitPrice).toBeNull();
    expect(data.exitDate).toBeNull();
    expect(data.grossPnL).toBeNull();
    expect(data.totalFees).toBeNull();
    expect(data.netPnL).toBeNull();
    expect(data.returnPercentage).toBeNull();
    expect(data.exitConversionRate).toBeNull();
    expect(data.exitConversionRateAt).toBeNull();

    expect((data.entryConversionRate as Decimal).toString()).toBe("1.25");
    expect(data.entryConversionRateAt).toEqual(snapshotAt);
    // Margin is recalculated from the duplicated position details.
    expect((data.quantity as Decimal).toString()).toBe("10000");
    expect((data.marginUsed as Decimal).toString()).toBe("137.5");

    // Creating an open duplicate never touches the account balance.
    expect(mockAccountUpdate).not.toHaveBeenCalled();
  });
});
