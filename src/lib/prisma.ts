import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma client singleton.
 *
 * Next.js dev mode hot-reloads modules, which would otherwise open a new
 * connection pool on every reload until Postgres refuses connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Connection pool cap. node-postgres defaults to 10, which is too small for a
 * single long-lived server handling hundreds of concurrent requests. Tune via
 * `DATABASE_POOL_SIZE` to match the deployment (Supabase/pgbouncer pools run
 * far smaller than a direct Postgres connection).
 */
const POOL_SIZE = Number(process.env.DATABASE_POOL_SIZE ?? 20);

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: POOL_SIZE }),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Transaction-aware Prisma handle.
 *
 * Repositories accept this so the same function works inside and outside a
 * `prisma.$transaction()` callback. The type is derived from the callback
 * parameter rather than hand-written with `Omit`, so it keeps matching whatever
 * the generated client actually hands to a transaction.
 */
export type PrismaTx = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export type PrismaClientOrTx = PrismaClient | PrismaTx;
