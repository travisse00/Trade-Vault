import { NextResponse } from "next/server";
import {
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "@/lib/service/account.service";
import {
  deleteWatchlistItem,
  updateWatchlistItem,
} from "@/lib/service/watchlist.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const item = await updateWatchlistItem(id, body);

    return NextResponse.json({
      success: true,
      message: "Watchlist asset updated.",
      item,
    });
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
      error instanceof Error ? error.message : "Unable to update watchlist item.";

    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }

    if (message.includes("already in your watchlist")) {
      return NextResponse.json({ success: false, error: message }, { status: 409 });
    }

    if (
      message.includes("required") ||
      message.includes("must be") ||
      message.includes("Invalid") ||
      message.includes("Provide at least one field")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    if (message.includes("run the latest database migrations")) {
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }

    console.error("Update watchlist item error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to update watchlist asset." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteWatchlistItem(id);

    return NextResponse.json({
      success: true,
      message: "Asset removed from watchlist.",
      ...result,
    });
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
      error instanceof Error ? error.message : "Unable to remove watchlist item.";

    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }

    if (
      message.includes("run the latest database migrations") ||
      message.includes("prisma generate")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 503 });
    }

    console.error("Delete watchlist item error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to remove watchlist asset." },
      { status: 500 }
    );
  }
}
