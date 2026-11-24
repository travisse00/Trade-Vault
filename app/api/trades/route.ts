import { NextResponse } from "next/server";
import {
  createTrade,
  getTrades,
  closeTrade,
  updateTrade,
  deleteTrade,
} from "@/lib/service/trade.service";
import { uploadTradeImages } from "@/lib/service/trade-image.service";

export async function GET() {
  try {
    const { trades, currency } = await getTrades();

    return NextResponse.json({
      success: true,
      trades,
      currency,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch trades.";

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

    console.error("Get trades error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to fetch trades." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let tradeCreated = false;

  try {
    let body: unknown;
    let images: File[] = [];

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const tradeData = formData.get("trade");

      if (typeof tradeData !== "string") {
        return NextResponse.json(
          { success: false, error: "Trade details are required." },
          { status: 400 },
        );
      }

      try {
        body = JSON.parse(tradeData);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid trade details." },
          { status: 400 },
        );
      }

      images = formData
        .getAll("images")
        .filter((item): item is File => item instanceof File);
    } else {
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid request body." },
          { status: 400 },
        );
      }
    }

    if (images.length > 5) {
      return NextResponse.json(
        {
          success: false,
          error: "You can upload a maximum of 5 images per trade.",
        },
        { status: 400 },
      );
    }

    const trade = await createTrade(body);
    tradeCreated = true;

    let uploadedImages: Awaited<ReturnType<typeof uploadTradeImages>> = [];

    if (images.length > 0) {
      uploadedImages = await uploadTradeImages(trade.id, images);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Trade created successfully.",
        trade: {
          ...trade,
          images: uploadedImages,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while creating the trade.";

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
      message.includes("Invalid") ||
      message.includes("required") ||
      message.includes("greater than") ||
      message.includes("cannot be") ||
      message.includes("maximum") ||
      message.includes("Only PNG") ||
      message.includes("5 MB")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: message,
          tradeCreated,
        },
        { status: 400 },
      );
    }

    console.error("Create trade error:", error);

    return NextResponse.json(
      {
        success: false,
        error: tradeCreated
          ? "The trade was created, but its images could not be uploaded."
          : "Unable to create trade. Please try again.",
        tradeCreated,
      },
      { status: 500 },
    );
  }
}


export async function PATCH(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as { id?: unknown }).id !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Trade ID is required." },
        { status: 400 },
      );
    }

    const { id, ...closeInput } = body as {
      id: string;
    } & Record<string, unknown>;

    const trade = await closeTrade(id, closeInput);

    return NextResponse.json({
      success: true,
      message: "Trade closed successfully.",
      trade,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to close trade.";

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

    if (message.includes("Trade not found")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    if (message.includes("already closed")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 409 },
      );
    }

    if (
      message.includes("valid trade ID") ||
      message.includes("greater than") ||
      message.includes("cannot be negative") ||
      message.includes("earlier than") ||
      message.includes("missing") ||
      message.includes("valid number")
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    console.error("Close trade error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to close trade. Please try again." },
      { status: 500 },
    );
  }
}


export async function PUT(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let tradeId: string | undefined;
    let tradeData: Record<string, unknown> = {};
    let removeImageIds: string[] = [];
    let images: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const id = formData.get("id");

      if (typeof id !== "string" || !id) {
        return NextResponse.json(
          { success: false, error: "Trade ID is required." },
          { status: 400 },
        );
      }

      tradeId = id;

      const rawTrade = formData.get("trade");

      if (typeof rawTrade !== "string") {
        return NextResponse.json(
          { success: false, error: "Trade details are required." },
          { status: 400 },
        );
      }

      try {
        tradeData = JSON.parse(rawTrade) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid trade details." },
          { status: 400 },
        );
      }

      const rawRemove = formData.get("removeImageIds");

      if (typeof rawRemove === "string" && rawRemove.trim()) {
        try {
          const parsed = JSON.parse(rawRemove);

          if (Array.isArray(parsed)) {
            removeImageIds = parsed.filter(
              (value): value is string => typeof value === "string",
            );
          }
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid image selection." },
            { status: 400 },
          );
        }
      }

      images = formData
        .getAll("images")
        .filter((item): item is File => item instanceof File);
    } else {
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid request body." },
          { status: 400 },
        );
      }

      if (
        !body ||
        typeof body !== "object" ||
        typeof (body as { id?: unknown }).id !== "string"
      ) {
        return NextResponse.json(
          { success: false, error: "Trade ID is required." },
          { status: 400 },
        );
      }

      const {
        id,
        removeImageIds: rawRemove,
        ...rest
      } = body as { id: string; removeImageIds?: unknown } & Record<
        string,
        unknown
      >;

      tradeId = id;
      tradeData = rest;

      if (Array.isArray(rawRemove)) {
        removeImageIds = rawRemove.filter(
          (value): value is string => typeof value === "string",
        );
      }
    }

    if (images.length > 5) {
      return NextResponse.json(
        {
          success: false,
          error: "You can upload a maximum of 5 images per trade.",
        },
        { status: 400 },
      );
    }

    const trade = await updateTrade(
      tradeId as string,
      tradeData,
      removeImageIds,
      images,
    );

    return NextResponse.json({
      success: true,
      message: "Trade updated successfully.",
      trade,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update trade.";

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

    if (message.includes("Trade not found")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    if (
      message.includes("valid trade ID") ||
      message.includes("Trade details are required") ||
      message.includes("Invalid") ||
      message.includes("required") ||
      message.includes("greater than") ||
      message.includes("cannot be") ||
      message.includes("maximum") ||
      message.includes("Only PNG") ||
      message.includes("5 MB") ||
      message.includes("no longer exist") ||
      message.includes("valid number")
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    console.error("Update trade error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to update trade. Please try again." },
      { status: 500 },
    );
  }
}


export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get("id");

    if (!tradeId) {
      return NextResponse.json(
        { success: false, error: "Trade ID is required." },
        { status: 400 },
      );
    }

    await deleteTrade(tradeId);

    return NextResponse.json({
      success: true,
      message: "Trade deleted successfully.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete trade.";

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

    if (message.includes("Trade not found")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    if (
      message.includes("valid trade ID") ||
      message.includes("Unable to delete trade images")
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    console.error("Delete trade error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to delete trade." },
      { status: 500 },
    );
  }
}
