
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

function createPrismaClient(): PrismaClient {
  const configuredMax = Number(process.env.DATABASE_POOL_MAX);
  const max =
    Number.isInteger(configuredMax) && configuredMax > 0
      ? configuredMax
      : 1;

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    /**
     * Supabase's session-mode pooler caps concurrent clients (15 on the free
     * tier). Each app instance therefore keeps only one connection by default
     * so several server bundles / replicas cannot exhaust the pool. Raise this
     * with DATABASE_POOL_MAX only when using a bigger pool or the transaction
     * pooler (port 6543), which multiplexes many clients.
     */
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ...(ca
      ? {
          ssl: {
            ca,
            rejectUnauthorized: true,
          },
        }
      : {}),
  });

  return new PrismaClient({ adapter });
}

/**
 * Cache the client on globalThis in every environment, not just development.
 * Next.js can bundle this module into several server chunks; without the
 * global singleton each chunk creates its own connection pool and quickly
 * exceeds Supabase's session limit.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
