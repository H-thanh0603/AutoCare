/**
 * Integration test setup.
 *
 * Integration tests talk to a real PostgreSQL database (the local Docker one in
 * development). They must never run against a production URL, so this file
 * refuses to start when `DATABASE_URL` is missing.
 *
 * Tests create their own fixtures with a unique prefix and delete them
 * afterwards, so they can run alongside seeded demo data without wiping it.
 */

import "dotenv/config";
import { afterAll } from "vitest";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL chưa được cấu hình. Chạy `pnpm db:up` rồi tạo file .env trước khi chạy integration test.",
  );
}

const { prisma } = await import("@/lib/prisma");

afterAll(async () => {
  await prisma.$disconnect();
});
