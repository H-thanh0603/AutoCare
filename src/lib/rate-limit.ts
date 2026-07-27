/**
 * Fixed-window rate limiting for login and other sensitive endpoints.
 *
 * Deliberately in-process: the MVP runs as a single Node instance, so a Map is
 * enough and adds no infrastructure. It does NOT survive a restart and does NOT
 * coordinate across instances — when AutoCare is scaled horizontally this must
 * be swapped for Redis (see docs/DECISIONS.md).
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Clears expired windows so the Map cannot grow without bound. */
function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the caller may retry; 0 when not limited. */
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Identifier being limited, e.g. `login:user@example.com`. */
  key: string;
  limit: number;
  windowMs: number;
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    sweep(now);
    lastSweep = now;
  }

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Drops a counter, e.g. after a successful login. */
export function resetRateLimit(key: string): void {
  windows.delete(key);
}

/** Test hook — never call from application code. */
export function clearAllRateLimits(): void {
  windows.clear();
  lastSweep = 0;
}

export const RATE_LIMITS = {
  /** 5 attempts per 10 minutes per email+IP pair. */
  LOGIN: { limit: 5, windowMs: 10 * 60_000 },
  /** 3 registrations per hour per IP. */
  REGISTER: { limit: 3, windowMs: 60 * 60_000 },
  /** 30 share-link lookups per 10 minutes per IP, to blunt token guessing. */
  SHARE_LINK: { limit: 30, windowMs: 10 * 60_000 },
} as const;
