import "server-only";

import Decimal from "decimal.js";
import type { TradingAccount } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { accountTransactionSchema } from "@/lib/validation/account";

type DbClient = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Thrown when there is no signed-in session. Callers can use this to send the
 * visitor to the login page instead of the account-setup page.
 */
export class UnauthenticatedError extends Error {
  constructor() {
    super("You must be logged in to perform this action.");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Thrown when the signed-in user has not configured a trading account yet.
 *
 * This is a distinct type (rather than a generic Error) so pages can redirect
 * to account setup *only* for this genuine case, and never mistake an
 * unrelated failure for a missing account.
 */
export class AccountSetupRequiredError extends Error {
  constructor() {
    super("Complete your account setup before managing your balance.");
    this.name = "AccountSetupRequiredError";
  }
}

/**
 * Resolve the signed-in user and their trading account.
 *
 * Throws when there is no session or the account has not been configured yet,
 * so callers never operate on another user's data.
 */
export async function getAuthenticatedAccount(): Promise<{
  account: TradingAccount;
  userId: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthenticatedError();
  }

  const account = await prisma.tradingAccount.findUnique({
    where: { userId: user.id },
  });

  if (!account) {
    throw new AccountSetupRequiredError();
  }

  return { account, userId: user.id };
}

export interface AccountOverview {
  currency: string;
  /** Starting balance, locked at account setup. */
  initialBalance: string;
  /** initialBalance + deposits − withdrawals + realised P&L. */
  currentBalance: string;
  totalDeposits: string;
  totalWithdrawals: string;
  realizedPnl: string;
}

/**
 * Derive the balance overview for an already-authenticated account.
 *
 * The balance is never stored: it is always initialBalance + deposits −
 * withdrawals + the net P&L of closed trades, so it can never drift from the
 * underlying transactions and trades. Open trades are deliberately excluded.
 *
 * Accepting the account as an argument lets callers that already resolved the
 * session (e.g. the dashboard) avoid a second, redundant auth round-trip.
 *
 * A database client/transaction can be provided so the same calculation can be
 * reused inside a transaction (for example, when a withdrawal must be checked
 * and recorded atomically).
 */
export async function buildAccountOverview(
  account: TradingAccount,
  db: DbClient = prisma
): Promise<AccountOverview> {
  const [deposits, withdrawals, realized] = await Promise.all([
    db.accountTransaction.aggregate({
      where: { accountId: account.id, type: "DEPOSIT" },
      _sum: { amount: true },
    }),
    db.accountTransaction.aggregate({
      where: { accountId: account.id, type: "WITHDRAWAL" },
      _sum: { amount: true },
    }),
    db.trade.aggregate({
      where: { accountId: account.id, status: "CLOSED" },
      _sum: { netPnL: true },
    }),
  ]);

  const initialBalance = new Decimal(account.initialBalance);
  const totalDeposits = deposits._sum.amount ?? new Decimal(0);
  const totalWithdrawals = withdrawals._sum.amount ?? new Decimal(0);
  const realizedPnl = realized._sum.netPnL ?? new Decimal(0);

  const currentBalance = initialBalance
    .plus(totalDeposits)
    .minus(totalWithdrawals)
    .plus(realizedPnl);

  return {
    currency: account.currency,
    initialBalance: initialBalance.toFixed(2),
    currentBalance: currentBalance.toFixed(2),
    totalDeposits: totalDeposits.toFixed(2),
    totalWithdrawals: totalWithdrawals.toFixed(2),
    realizedPnl: realizedPnl.toFixed(2),
  };
}

/** Derive the balance overview for the signed-in user. */
export async function getAccountOverview(): Promise<AccountOverview> {
  const { account } = await getAuthenticatedAccount();

  return buildAccountOverview(account);
}

/**
 * Record a deposit or withdrawal. Amounts are validated and stored as Decimal,
 * so no floating point arithmetic is involved.
 *
 * Withdrawals are checked against the latest derived available balance and are
 * created inside a transaction that locks the trading account row, preventing
 * concurrent withdrawals from collectively exceeding the balance.
 */
export async function createAccountTransaction(input: unknown) {
  const { account } = await getAuthenticatedAccount();

  const result = accountTransactionSchema.safeParse(input);

  if (!result.success) {
    throw new Error(
      result.error.issues.map((issue) => issue.message).join(" ")
    );
  }

  const amount = new Decimal(String(result.data.amount));

  if (amount.lte(0)) {
    throw new Error("Amount must be greater than zero.");
  }

  if (result.data.type === "WITHDRAWAL") {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "TradingAccount" WHERE id = ${account.id} FOR UPDATE`;

      const current = await buildAccountOverview(account, tx);
      const availableBalance = new Decimal(current.currentBalance);

      if (amount.gt(availableBalance)) {
        throw new Error(
          "Insufficient balance. You cannot withdraw more than your available balance."
        );
      }

      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: result.data.type,
          amount,
          note: result.data.note?.trim() || null,
          date: result.data.date,
        },
      });

      return buildAccountOverview(account, tx);
    });
  }

  await prisma.accountTransaction.create({
    data: {
      accountId: account.id,
      type: result.data.type,
      amount,
      note: result.data.note?.trim() || null,
      date: result.data.date,
    },
  });

  return buildAccountOverview(account);
}

export type TransactionKind = "DEPOSIT" | "WITHDRAWAL" | "TRADE_PNL";

export interface TransactionHistoryEntry {
  id: string;
  kind: TransactionKind;
  /** Signed display amount as a string. */
  amount: string;
  date: string;
  description: string;
  tradeId: string | null;
  tradeAsset: string | null;
}

export interface TransactionHistory {
  currency: string;
  entries: TransactionHistoryEntry[];
}

/**
 * A single, chronological ledger combining cash movements (deposits and
 * withdrawals) with realised trading activity, so users can distinguish
 * deposits, withdrawals and trade P&L in one place.
 */
export async function buildTransactionHistory(
  account: TradingAccount
): Promise<TransactionHistory> {
  const [transactions, trades] = await Promise.all([
    prisma.accountTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { date: "desc" },
    }),
    prisma.trade.findMany({
      where: { accountId: account.id, status: "CLOSED" },
      select: {
        id: true,
        asset: true,
        netPnL: true,
        exitDate: true,
      },
      orderBy: { exitDate: "desc" },
    }),
  ]);

  const entries: TransactionHistoryEntry[] = [
    ...transactions.map((transaction) => ({
      id: transaction.id,
      kind:
        transaction.type === "DEPOSIT"
          ? ("DEPOSIT" as const)
          : ("WITHDRAWAL" as const),
      amount: transaction.amount.toFixed(2),
      date: transaction.date.toISOString(),
      description:
        transaction.note?.trim() ||
        (transaction.type === "DEPOSIT" ? "Deposit" : "Withdrawal"),
      tradeId: null,
      tradeAsset: null,
    })),
    ...trades.map((trade) => ({
      id: `trade-${trade.id}`,
      kind: "TRADE_PNL" as const,
      amount: new Decimal(trade.netPnL ?? 0).toFixed(2),
      date: (trade.exitDate ?? new Date(0)).toISOString(),
      description: `Realised P&L · ${trade.asset}`,
      tradeId: trade.id,
      tradeAsset: trade.asset,
    })),
  ];

  entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return { currency: account.currency, entries };
}

/** Transaction history for the signed-in user. */
export async function getTransactionHistory(): Promise<TransactionHistory> {
  const { account } = await getAuthenticatedAccount();

  return buildTransactionHistory(account);
}

/**
 * Everything the account page needs, resolved with a single auth round-trip so
 * the page cannot be bounced to setup by a redundant, racing session lookup.
 */
export async function getAccountPageData(): Promise<{
  overview: AccountOverview;
  history: TransactionHistory;
}> {
  const { account } = await getAuthenticatedAccount();

  const [overview, history] = await Promise.all([
    buildAccountOverview(account),
    buildTransactionHistory(account),
  ]);

  return { overview, history };
}
