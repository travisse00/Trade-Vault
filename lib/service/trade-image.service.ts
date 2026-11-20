
import "server-only";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "trade-images";
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// The bucket is private, so images must be viewed through short-lived
// signed URLs rather than public object URLs.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const MAX_TRADE_IMAGES = MAX_IMAGES;

/**
 * Validate uploaded image files without touching storage or the database.
 * Shared by the create and edit flows.
 */
export function validateTradeImageFiles(files: File[]): void {
  if (files.length > MAX_IMAGES) {
    throw new Error("You can upload a maximum of 5 images per trade.");
  }

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Only PNG, JPG and WEBP images are allowed.");
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      throw new Error("Each image must be between 1 byte and 5 MB.");
    }
  }
}

/**
 * Upload image files to the private bucket and return their storage paths.
 * The database records are created separately so callers can include them in
 * their own transaction.
 */
export async function uploadTradeImageObjects(
  userId: string,
  tradeId: string,
  files: File[]
): Promise<string[]> {
  const supabase = await createClient();
  const uploadedPaths: string[] = [];

  for (const file of files) {
    const extension = file.type === "image/jpeg"
      ? "jpg"
      : file.type.split("/")[1];

    const filePath =
      `${userId}/${tradeId}/${randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    uploadedPaths.push(filePath);
  }

  return uploadedPaths;
}

/**
 * Remove image objects from the private bucket. Best-effort cleanup helper.
 */
export async function deleteTradeImageObjects(
  paths: string[]
): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths);

  if (error) {
    throw new Error(error.message);
  }
}

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be logged in to upload images.");
  }

  return { user, supabase };
}

export async function uploadTradeImages(
  tradeId: string,
  files: File[]
) {
  const { user } = await getAuthenticatedUser();

  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  validateTradeImageFiles(files);

  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      account: {
        userId: user.id,
      },
    },
    select: {
      id: true,
      images: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!trade) {
    throw new Error("Trade not found.");
  }

  if (trade.images.length + files.length > MAX_IMAGES) {
    throw new Error("A trade can have a maximum of 5 images.");
  }

  let uploadedPaths: string[] = [];

  try {
    uploadedPaths = await uploadTradeImageObjects(
      user.id,
      tradeId,
      files
    );

    const images = await prisma.$transaction(
      uploadedPaths.map((path) =>
        prisma.tradeImage.create({
          data: {
            tradeId,
            storagePath: path,
          },
        })
      )
    );

    return images;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await deleteTradeImageObjects(uploadedPaths).catch(() => {});
    }

    throw error;
  }
}

/**
 * Create short-lived signed URLs for the given storage paths.
 *
 * The `trade-images` bucket is private, so screenshots can only be rendered
 * through signed URLs. Returns a map keyed by storage path. Signing failures
 * are logged and skipped rather than thrown, so a storage hiccup never takes
 * down the trade detail page.
 */
export async function getTradeImageSignedUrls(
  paths: string[]
): Promise<Record<string, string>> {
  const validPaths = paths.filter(
    (path): path is string => typeof path === "string" && path.length > 0
  );

  if (validPaths.length === 0) {
    return {};
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrls(validPaths, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    console.error("Unable to sign trade image URLs:", error.message);

    return {};
  }

  const signedUrls: Record<string, string> = {};

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      signedUrls[item.path] = item.signedUrl;
    }
  }

  return signedUrls;
}
