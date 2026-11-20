import { NextResponse } from "next/server";
import {
  AccountSetupRequiredError,
  UnauthenticatedError,
  getAuthenticatedAccount,
} from "@/lib/service/account.service";
import { getRelatedCachedNews } from "@/lib/service/news.service";

const WATCHLIST_CATEGORIES = new Set([
  "FOREX",
  "CRYPTO",
  "STOCKS",
  "INDICES",
  "COMMODITIES",
]);

export async function GET(request: Request) {
  try {
    // Require authenticated account context, consistent with dashboard access.
    // This endpoint only reads existing in-memory news cache and never triggers provider requests.
    await getAuthenticatedAccount();

    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get("symbol") || "").trim();
    const name = (searchParams.get("name") || "").trim();
    const categoryParam = (searchParams.get("category") || "").trim().toUpperCase();

    if (!symbol && !name) {
      return NextResponse.json(
        { success: false, error: "A symbol or asset name is required." },
        { status: 400 }
      );
    }

    if (!WATCHLIST_CATEGORIES.has(categoryParam)) {
      return NextResponse.json(
        { success: false, error: "A valid watchlist category is required." },
        { status: 400 }
      );
    }

    const articles = getRelatedCachedNews({
      symbol,
      name,
      category: categoryParam as "FOREX" | "CRYPTO" | "STOCKS" | "INDICES" | "COMMODITIES",
      limit: 20,
    });

    return NextResponse.json({
      success: true,
      articles,
      count: articles.length,
      source: "cached-news-only",
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to view related news." },
        { status: 401 }
      );
    }

    if (error instanceof AccountSetupRequiredError) {
      return NextResponse.json(
        { success: false, error: "Complete your account setup to view related news." },
        { status: 403 }
      );
    }

    console.error("Related cached news error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load related cached news." },
      { status: 500 }
    );
  }
}
