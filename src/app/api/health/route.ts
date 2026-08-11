import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for load balancers and uptime monitors.
 *
 * Touches the DB so a hung pool or dead Postgres reports as unhealthy instead
 * of the process still answering on its own.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "up", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "down" },
      { status: 503 },
    );
  }
}
