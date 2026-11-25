import { describe, expect, it } from "vitest";
import {
  buildCreateTradePayload,
  buildDuplicatePrefill,
  consumeDuplicateDraft,
  DUPLICATE_DRAFT_STORAGE_KEY,
  saveDuplicateDraft,
  toLocalDateTimeValue,
  type DuplicateTradeSource,
  type StorageLike,
} from "./trade-duplicate";
import { tradeSchema } from "./validation/trade";

type TestSource = DuplicateTradeSource & Record<string, unknown>;

function makeSource(
  overrides: Partial<DuplicateTradeSource> & Record<string, unknown> = {}
): TestSource {
  return {
    id: "source_trade",
    marketType: "FOREX",
    asset: "EUR/USD",
    direction: "LONG",
    entryPrice: "1.1",
    lotSize: "0.1",
    positionValue: null,
    leverage: "100",
    fees: "0",
    fundingFees: "0",
    stopLoss: "1.08",
    takeProfit: "1.15",
    riskPercentage: "2",
    strategy: "SMC",
    notes: "Original setup notes",
    ...overrides,
  };
}

const closedDetails = {
  status: "CLOSED",
  exitPrice: "1.12",
  exitDate: "2026-11-24T10:00:00.000Z",
  grossPnL: "250",
  totalFees: "0.7",
  netPnL: "249.3",
  returnPercentage: "12.5",
  exitConversionRate: "1",
  exitConversionRateAt: "2026-11-24T10:00:00.000Z",
  images: [{ storagePath: "user_1/source_trade/chart.png" }],
};

const cases = [
  {
    name: "open Forex",
    source: makeSource({ id: "forex_open", status: "OPEN" }),
    expected: {
      marketType: "FOREX" as const,
      asset: "EUR/USD",
      direction: "LONG" as const,
      entryPrice: "1.1",
      lotSize: "0.1",
      positionValue: "",
      leverage: "100",
      fees: "0",
      fundingFees: "0",
    },
  },
  {
    name: "closed Forex",
    source: makeSource({ id: "forex_closed", ...closedDetails }),
    expected: {
      marketType: "FOREX" as const,
      asset: "EUR/USD",
      direction: "LONG" as const,
      entryPrice: "1.1",
      lotSize: "0.1",
      positionValue: "",
      leverage: "100",
      fees: "0",
      fundingFees: "0",
    },
  },
  {
    name: "closed Crypto Spot",
    source: makeSource({
      id: "spot_closed",
      marketType: "CRYPTO_SPOT",
      asset: "BTC/USDT",
      direction: "SHORT",
      entryPrice: "60000",
      lotSize: null,
      positionValue: "500",
      leverage: "1",
      fees: "2.5",
      ...closedDetails,
      exitPrice: "62000",
    }),
    expected: {
      marketType: "CRYPTO_SPOT" as const,
      asset: "BTC/USDT",
      // Spot only supports long positions, even if the source was tampered with.
      direction: "LONG" as const,
      entryPrice: "60000",
      lotSize: "",
      positionValue: "500",
      leverage: "1",
      fees: "2.5",
      fundingFees: "0",
    },
  },
  {
    name: "closed Crypto Futures",
    source: makeSource({
      id: "futures_closed",
      marketType: "CRYPTO_FUTURES",
      asset: "BTC/USDT",
      direction: "SHORT",
      entryPrice: "62000",
      lotSize: null,
      positionValue: "750",
      leverage: "20",
      fundingFees: "1.25",
      ...closedDetails,
      exitPrice: "61000",
    }),
    expected: {
      marketType: "CRYPTO_FUTURES" as const,
      asset: "BTC/USDT",
      direction: "SHORT" as const,
      entryPrice: "62000",
      lotSize: "",
      positionValue: "750",
      leverage: "20",
      fees: "0",
      fundingFees: "1.25",
    },
  },
];

const now = new Date("2026-11-25T10:30:00.000Z");

function makeStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, String(value));
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("Duplicate Trade draft", () => {
  it.each(cases)(
    "prefills reusable fields for $name and resets the rest",
    ({ source, expected }) => {
      const before = structuredClone(source);
      const prefill = buildDuplicatePrefill(source, now);

      expect(prefill).toMatchObject(expected);
      expect(prefill.status).toBe("OPEN");
      expect(prefill.entryDate).toBe(toLocalDateTimeValue(now));
      expect(prefill.exitPrice).toBe("");
      expect(prefill.exitDate).toBe("");
      expect(prefill.stopLoss).toBe("1.08");
      expect(prefill.takeProfit).toBe("1.15");
      expect(prefill.riskPercentage).toBe("2");
      expect(prefill.strategy).toBe("SMC");
      expect(prefill.notes).toBe("Original setup notes");

      for (const field of [
        "grossPnL",
        "netPnL",
        "returnPercentage",
        "images",
        "entryConversionRate",
        "exitConversionRate",
      ]) {
        expect(prefill).not.toHaveProperty(field);
      }

      // The original trade is never mutated by duplication.
      expect(source).toEqual(before);
    }
  );

  it.each(cases)(
    "submits $name as a valid new OPEN trade with no old results",
    ({ source, expected }) => {
      const prefill = buildDuplicatePrefill(source, now);
      const payload = buildCreateTradePayload({
        ...prefill,
        defaultLeverage: 10,
      });

      expect(payload.status).toBe("OPEN");
      expect(payload.asset).toBe(expected.asset);
      expect(payload.direction).toBe(expected.direction);
      expect(payload.marketType).toBe(expected.marketType);
      expect(payload.leverage).toBe(Number(expected.leverage));

      for (const field of [
        "exitPrice",
        "exitDate",
        "grossPnL",
        "totalFees",
        "netPnL",
        "returnPercentage",
        "images",
        "entryConversionRate",
        "exitConversionRate",
        "id",
      ]) {
        expect(payload).not.toHaveProperty(field);
      }

      expect(tradeSchema.safeParse(payload).success).toBe(true);
    }
  );

  it("keeps edits made in the prefilled form", () => {
    const prefill = buildDuplicatePrefill(makeSource(), now);

    const payload = buildCreateTradePayload({
      ...prefill,
      asset: "GBP/USD",
      direction: "SHORT",
      entryPrice: "1.25",
      notes: "Edited notes",
      defaultLeverage: 10,
    });

    expect(payload).toMatchObject({
      asset: "GBP/USD",
      direction: "SHORT",
      entryPrice: 1.25,
      notes: "Edited notes",
    });
  });

  it("passes the draft through single-use session state", () => {
    const storage = makeStorage();
    const prefill = buildDuplicatePrefill(
      makeSource({ id: "spot_closed" }),
      now
    );

    saveDuplicateDraft(prefill, "spot_closed", storage);
    expect(consumeDuplicateDraft(storage)).toEqual(prefill);
    expect(consumeDuplicateDraft(storage)).toBeNull();
  });

  it("rejects tampered or stale drafts", () => {
    const storage = makeStorage();
    const prefill = buildDuplicatePrefill(makeSource(), now);

    storage.setItem(
      DUPLICATE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        sourceTradeId: "source_trade",
        prefill: { ...prefill, status: "CLOSED", exitPrice: "1.2" },
      })
    );

    expect(consumeDuplicateDraft(storage)).toBeNull();
    expect(storage.getItem(DUPLICATE_DRAFT_STORAGE_KEY)).toBeNull();

    saveDuplicateDraft(prefill, "source_trade", storage);
    storage.setItem(
      DUPLICATE_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 99, prefill })
    );

    expect(consumeDuplicateDraft(storage)).toBeNull();
  });
});
