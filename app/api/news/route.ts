import { NextResponse } from "next/server";
import { getMarketNews } from "@/lib/service/news.service";
import {
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "@/lib/service/account.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await getMarketNews({
      category: searchParams.get("category"),
      query: searchParams.get("q"),
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to view market news." },
        { status: 401 }
      );
    }

    if (error instanceof AccountSetupRequiredError) {
      return NextResponse.json(
        {
          success: false,
          error: "Complete your account setup to view market news.",
        },
        { status: 403 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to load market news.";

    const lower = message.toLowerCase();
    const isRateLimit =
      lower.includes("rate limit") ||
      lower.includes("usage limit") ||
      lower.includes("too many requests");

    if (isRateLimit) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 429 }
      );
    }

    if (
      lower.includes("not configured") ||
      lower.includes("rejected the api token") ||
      lower.includes("does not allow")
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 503 }
      );
    }

    if (lower.includes("rejected the request parameters")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    console.error("Get market news error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load market news." },
      { status: 500 }
    );
  }
}
