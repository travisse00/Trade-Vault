
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAccountOverview } from "@/lib/service/account.service";
import { z } from "zod";
import { formatZodError } from "@/lib/validation/format";

const createAccountSchema = z.object({
  initialBalance: z.coerce.number().finite().min(0),
  currency: z.string().length(3).toUpperCase(),
});

const updatePreferencesSchema = z.object({
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
  defaultMarket: z.enum(["Forex", "Crypto Spot", "Crypto Futures"]).optional(),
  timezone: z.string().min(1).max(100).optional(),
  defaultLeverage: z.coerce.number().int().min(1).max(500).optional(),
});

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;

  return data.user;
}

// GET: Retrieve the user's trading account.
export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const account = await prisma.tradingAccount.findUnique({
      where: { userId: user.id },
    });

    // The balance overview is derived from the account's records. It is
    // additive to the response so existing consumers keep working unchanged.
    const overview = account ? await getAccountOverview() : null;

    return Response.json({ success: true, account, overview });
  } catch {
    return Response.json(
      { success: false, error: "Unable to retrieve account." },
      { status: 500 },
    );
  }
}

// POST: Set the initial balance and create the account once.

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const valid = createAccountSchema.safeParse(body);

  if (!valid.success) {
    return Response.json(
      { success: false, error: formatZodError(valid.error) },
      { status: 400 },
    );
  }

  try {
    // Return the existing account if it has already been configured.
    const existingAccount = await prisma.tradingAccount.findUnique({
      where: { userId: user.id },
    });

    if (existingAccount) {
      return Response.json({
        success: true,
        account: existingAccount,
        alreadyConfigured: true,
      });
    }

    const account = await prisma.tradingAccount.create({
      data: {
        userId: user.id,
        initialBalance: valid.data.initialBalance,
        currency: valid.data.currency,
      },
    });

    return Response.json(
      { success: true, account, alreadyConfigured: false },
      { status: 201 },
    );
  } catch (error) {
    // Handle simultaneous requests safely.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const existingAccount = await prisma.tradingAccount.findUnique({
        where: { userId: user.id },
      });

      if (existingAccount) {
        return Response.json({
          success: true,
          account: existingAccount,
          alreadyConfigured: true,
        });
      }
    }

    console.error("Create account error:", error);

    return Response.json(
      { success: false, error: "Unable to create account." },
      { status: 500 },
    );
  }
}


// PATCH: Update preferences without changing the initial balance or currency.
export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const valid = updatePreferencesSchema.safeParse(body);

  if (!valid.success || Object.keys(valid.data ?? {}).length === 0) {
    return Response.json(
      {
        success: false,
        error: valid.success
          ? "No preferences provided."
          : formatZodError(valid.error),
      },
      { status: 400 },
    );
  }

  try {
    const account = await prisma.tradingAccount.update({
      where: { userId: user.id },
      data: valid.data,
    });

    return Response.json({ success: true, account });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return Response.json(
        { success: false, error: "Account setup is required first." },
        { status: 404 },
      );
    }

    return Response.json(
      { success: false, error: "Unable to update preferences." },
      { status: 500 },
    );
  }
}
