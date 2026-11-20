import { NextResponse } from "next/server";
import {
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "@/lib/service/account.service";
import {
  createWatchlistItem,
  getWatchlistItems,
} from "@/lib/service/watchlist.service";

export async function GET() {
  try {
    const items = await getWatchlistItems();
    return NextResponse.json({ success: true, items });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to view your watchlist." },
        { status: 401 }
      );
    }

    if (error instanceof AccountSetupRequiredError) {
      return NextResponse.json(
        { success: false, error: "Complete your account setup to use the watchlist." },
        { status: 403 }
      );
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("prisma generate") || message.includes("database migrations")) {
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }

    console.error("Get watchlist error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load watchlist." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const item = await createWatchlistItem(body);

    return NextResponse.json(
      {
        success: true,
        message: "Asset added to watchlist.",
        item,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to update your watchlist." },
        { status: 401 }
      );
    }

    if (error instanceof AccountSetupRequiredError) {
      return NextResponse.json(
        { success: false, error: "Complete your account setup to use the watchlist." },
        { status: 403 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to add watchlist item.";

    if (
      message.includes("already in your watchlist") ||
      message.includes("required") ||
      message.includes("must be") ||
      message.includes("Invalid") ||
      message.includes("category")
    ) {
      const status = message.includes("already in your watchlist") ? 409 : 400;
      return NextResponse.json({ success: false, error: message }, { status });
    }

    if (
      message.includes("run the latest database migrations") ||
      message.includes("prisma generate")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }

    console.error("Create watchlist item error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to add asset to watchlist." },
      { status: 500 }
    );
  }
}
