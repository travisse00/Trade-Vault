import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

const {
  mockGetUser,
  mockAccountFindUnique,
  mockTransactionAggregate,
  mockTradeAggregate,
  mockTransactionCreate,
  mockTransactionFindMany,
  mockTradeFindMany,
  mockRedirect,
  mockExecuteRaw,
  mock$Transaction,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAccountFindUnique: vi.fn(),
  mockTransactionAggregate: vi.fn(),
  mockTradeAggregate: vi.fn(),
  mockTransactionCreate: vi.fn(),
  mockTransactionFindMany: vi.fn(),
  mockTradeFindMany: vi.fn(),
  mockRedirect: vi.fn(),
  mockExecuteRaw: vi.fn(),
  mock$Transaction: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mock$Transaction,
    $executeRaw: mockExecuteRaw,
    tradingAccount: { findUnique: mockAccountFindUnique },
    accountTransaction: {
      aggregate: mockTransactionAggregate,
      create: mockTransactionCreate,
      findMany: mockTransactionFindMany,
    },
    trade: { aggregate: mockTradeAggregate, findMany: mockTradeFindMany },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import {
  getAuthenticatedAccount,
  buildAccountOverview,
  createAccountTransaction,
  buildTransactionHistory,
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "./account.service";
import { loadWithAccountGuard } from "./account-guard";

const account = {
  id: "acct_1",
  userId: "user_1",
  initialBalance: new Decimal("1000"),
  currency: "USD",
  balanceSetAt: new Date("2026-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  dateFormat: "DD/MM/YYYY",
  defaultMarket: "Forex",
  timezone: "Africa/Lagos",
  defaultLeverage: 1,
};

function authenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user_1" } },
    error: null,
  });
}

describe("getAuthenticatedAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws UnauthenticatedError when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getAuthenticatedAccount()).rejects.toBeInstanceOf(
      UnauthenticatedError
    );
  });

  it("throws AccountSetupRequiredError when no account exists", async () => {
    authenticated();
    mockAccountFindUnique.mockResolvedValue(null);

    await expect(getAuthenticatedAccount()).rejects.toBeInstanceOf(
      AccountSetupRequiredError
    );
  });
});

describe("buildAccountOverview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("derives the balance from deposits, withdrawals and closed P&L", async () => {
    mockTransactionAggregate
      .mockResolvedValueOnce({ _sum: { amount: new Decimal("500") } })
      .mockResolvedValueOnce({ _sum: { amount: new Decimal("200") } });
    mockTradeAggregate.mockResolvedValue({
      _sum: { netPnL: new Decimal("75.50") },
    });

    const overview = await buildAccountOverview(account as never);

    expect(overview.initialBalance).toBe("1000.00");
    expect(overview.totalDeposits).toBe("500.00");
    expect(overview.totalWithdrawals).toBe("200.00");
    expect(overview.realizedPnl).toBe("75.50");
    // 1000 + 500 - 200 + 75.50
    expect(overview.currentBalance).toBe("1375.50");
  });

  it.each(["NGN", "USD", "EUR", "GBP"])(
    "keeps %s balances denominated in the account currency",
    async (currency) => {
      mockTransactionAggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal("500") } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal("200") } });
      mockTradeAggregate.mockResolvedValue({
        _sum: { netPnL: new Decimal("75.50") },
      });

      const overview = await buildAccountOverview({
        ...account,
        currency,
      } as never);

      expect(overview.currency).toBe(currency);
      expect(overview.currentBalance).toBe("1375.50");
      expect(overview.totalDeposits).toBe("500.00");
      expect(overview.totalWithdrawals).toBe("200.00");
    }
  );

  it("treats missing aggregates as zero", async () => {
    mockTransactionAggregate.mockResolvedValue({ _sum: { amount: null } });
    mockTradeAggregate.mockResolvedValue({ _sum: { netPnL: null } });

    const overview = await buildAccountOverview(account as never);

    expect(overview.currentBalance).toBe("1000.00");
  });
});

describe("createAccountTransaction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authenticated();
    mockAccountFindUnique.mockResolvedValue(account);
    mockTransactionAggregate.mockResolvedValue({ _sum: { amount: null } });
    mockTradeAggregate.mockResolvedValue({ _sum: { netPnL: null } });
    mock$Transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        $executeRaw: mockExecuteRaw,
        accountTransaction: {
          aggregate: mockTransactionAggregate,
          create: mockTransactionCreate,
        },
        trade: { aggregate: mockTradeAggregate },
      })
    );
  });

  it("stores the amount as a Decimal and returns the updated overview", async () => {
    mockTransactionCreate.mockResolvedValue({});

    await createAccountTransaction({
      type: "DEPOSIT",
      amount: 250.25,
      date: "2026-02-01T12:00:00.000Z",
      note: "  Monthly funding  ",
    });

    const data = mockTransactionCreate.mock.calls[0][0].data;
    expect(data.amount).toBeInstanceOf(Decimal);
    expect(data.amount.toString()).toBe("250.25");
    expect(data.note).toBe("Monthly funding");
    expect(data.accountId).toBe("acct_1");
  });

  it("rejects a non-positive amount without writing", async () => {
    await expect(
      createAccountTransaction({
        type: "WITHDRAWAL",
        amount: 0,
        date: "2026-02-01T12:00:00.000Z",
      })
    ).rejects.toThrow();

    expect(mockTransactionCreate).not.toHaveBeenCalled();
  });

  it("rejects a withdrawal that exceeds the available balance", async () => {
    await expect(
      createAccountTransaction({
        type: "WITHDRAWAL",
        amount: 1500,
        date: "2026-02-01T12:00:00.000Z",
      })
    ).rejects.toThrow(
      "Insufficient balance. You cannot withdraw more than your available balance."
    );

    expect(mockExecuteRaw).toHaveBeenCalled();
    expect(mockTransactionCreate).not.toHaveBeenCalled();
  });

  it("records a withdrawal within the available balance", async () => {
    mockTransactionCreate.mockResolvedValue({});

    await createAccountTransaction({
      type: "WITHDRAWAL",
      amount: 250,
      date: "2026-02-01T12:00:00.000Z",
      note: "Cash out",
    });

    expect(mock$Transaction).toHaveBeenCalledTimes(1);
    expect(mockExecuteRaw).toHaveBeenCalled();
    const data = mockTransactionCreate.mock.calls[0][0].data;
    expect(data.type).toBe("WITHDRAWAL");
    expect(data.amount).toBeInstanceOf(Decimal);
    expect(data.amount.toString()).toBe("250");
    expect(data.note).toBe("Cash out");
  });
});

describe("buildTransactionHistory", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("merges cash movements with closed trades, newest first", async () => {
    mockTransactionFindMany.mockResolvedValue([
      {
        id: "tx_1",
        type: "DEPOSIT",
        amount: new Decimal("100"),
        note: null,
        date: new Date("2026-01-10T12:00:00.000Z"),
      },
      {
        id: "tx_2",
        type: "WITHDRAWAL",
        amount: new Decimal("40"),
        note: "Rent",
        date: new Date("2026-01-05T12:00:00.000Z"),
      },
    ]);
    mockTradeFindMany.mockResolvedValue([
      {
        id: "trade_1",
        asset: "EUR/USD",
        netPnL: new Decimal("30"),
        exitDate: new Date("2026-01-20T10:00:00.000Z"),
      },
    ]);

    const { currency, entries } = await buildTransactionHistory(
      account as never
    );

    expect(currency).toBe("USD");
    expect(entries.map((entry) => entry.id)).toEqual([
      "trade-trade_1",
      "tx_1",
      "tx_2",
    ]);
    expect(entries[0].kind).toBe("TRADE_PNL");
    expect(entries[0].tradeId).toBe("trade_1");
    expect(entries[1].kind).toBe("DEPOSIT");
    expect(entries[1].description).toBe("Deposit");
    expect(entries[2].kind).toBe("WITHDRAWAL");
    expect(entries[2].description).toBe("Rent");
  });
});

describe("loadWithAccountGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mirror Next's redirect: it throws to unwind the render.
    mockRedirect.mockImplementation((to: string) => {
      throw new Error(`NEXT_REDIRECT:${to}`);
    });
  });

  it("redirects to account setup only when setup is required", async () => {
    await expect(
      loadWithAccountGuard(async () => {
        throw new AccountSetupRequiredError();
      })
    ).rejects.toThrow("NEXT_REDIRECT:/account-setup");
  });

  it("redirects to login when there is no session", async () => {
    await expect(
      loadWithAccountGuard(async () => {
        throw new UnauthenticatedError();
      })
    ).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("re-throws unrelated failures instead of redirecting", async () => {
    await expect(
      loadWithAccountGuard(async () => {
        throw new Error("database unavailable");
      })
    ).rejects.toThrow("database unavailable");

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns the loader result untouched", async () => {
    await expect(loadWithAccountGuard(async () => 42)).resolves.toBe(42);
  });
});
