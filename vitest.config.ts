import "dotenv/config";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Two projects so the fast pure-logic suite stays runnable without a database:
 * - `unit`        : domain rules, money math, state machines, schemas
 * - `integration` : hits Postgres, needs `pnpm db:up` and a migrated database
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
