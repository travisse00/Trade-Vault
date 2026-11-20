import type { ZodError } from "zod";

/**
 * Turn a Zod validation error into a single human-readable string.
 *
 * API routes hand `error` straight back to clients that render it (or wrap it
 * in `new Error(...)`), so it must be a string — never the raw error object.
 */
export function formatZodError(error: ZodError): string {
  const message = error.issues
    .map((issue) => issue.message)
    .filter(Boolean)
    .join(" ");

  return message || "Invalid input.";
}
