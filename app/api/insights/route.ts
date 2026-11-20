import { NextResponse } from "next/server";
import {
  getInsightsData,
  normalizeInsightsPeriod,
} from "@/lib/service/insights.service";
import {
  AccountSetupRequiredError,
  UnauthenticatedError,
} from "@/lib/service/account.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = normalizeInsightsPeriod(searchParams.get("period"));

    const insights = await getInsightsData(period);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        { success: false, error: "You must be logged in to view insights." },
        { status: 401 }
      );
    }

    if (error instanceof AccountSetupRequiredError) {
      return NextResponse.json(
        { success: false, error: "Complete your account setup to view insights." },
        { status: 403 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to load insights.";

    if (message.toLowerCase().includes("logged in")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 401 }
      );
    }

    if (message.toLowerCase().includes("account setup")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    console.error("Get insights error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to load insights." },
      { status: 500 }
    );
  }
}
