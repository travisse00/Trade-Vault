
import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Supabase requires TLS. The CA certificate can be supplied through an
 * environment variable (preferred in serverless deployments, where the file
 * below is not guaranteed to be part of the bundle) or read from the local
 * `certs/` directory during development. If neither is available we fall back
 * to the TLS settings in `DATABASE_URL` instead of crashing at import time.
 */
function loadCaCertificate(): string | undefined {
  if (process.env.DATABASE_CA_CERT) {
    return process.env.DATABASE_CA_CERT;
  }

  try {
    return readFileSync(
      join(process.cwd(), "certs", "supabase-ca.crt"),
      "utf8"
    );
  } catch {
    return undefined;
  }
}

const ca = loadCaCertificate();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ...(ca
    ? {
        ssl: {
          ca,
          rejectUnauthorized: true,
        },
      }
    : {}),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
