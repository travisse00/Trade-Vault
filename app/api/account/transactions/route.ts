import { NextResponse } from "next/server";
import {
  createAccountTransaction,
  getTransactionHistory,
} from "@/lib/service/account.service";

// GET: the merged transaction ledger for the signed-in user's account.
export async function GET() {
  try {
    const history = await getTransactionHistory();

    return NextResponse.json({ success: true, ...history });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch transactions.";

    if (message.includes("logged in")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 401 },
      );
    }

    if (message.includes("account setup")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 },
      );
    }

    console.error("Get transactions error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to fetch transactions." },
      { status: 500 },
    );
  }
}

// POST: record a deposit or withdrawal.
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const overview = await createAccountTransaction(body);

    return NextResponse.json(
      {
        success: true,
        message: "Transaction recorded successfully.",
        overview,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to record transaction.";

    if (message.includes("logged in")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 401 },
      );
    }

    if (message.includes("account setup")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 },
      );
    }

    if (
      message.includes("greater than zero") ||
      message.includes("valid number") ||
      message.includes("valid date") ||
      message.includes("too long") ||
      message.includes("Insufficient balance")
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    console.error("Create transaction error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to record transaction." },
      { status: 500 },
    );
  }
}
