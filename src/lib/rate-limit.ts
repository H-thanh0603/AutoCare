import { TooManyRequestsError } from "./errors";

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },
  REGISTER: { limit: 3, windowMs: 60 * 60 * 1000 },
  MEDIA_UPLOAD: { limit: 20, windowMs: 60 * 1000 },
  PUBLIC_SHARE: { limit: 30, windowMs: 60 * 1000 },
} as const;

// Cleanup stale rate limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 3_600_000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as { unref: () => void }).unref();
  }
}

export interface RateLimitOptions {
  /** Unique key combining IP address, user ID, or endpoint name */
  key?: string;
  identifier?: string;
  /** Maximum number of allowed requests within the time window */
  limit?: number;
  maxRequests?: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const identifier = options.key ?? options.identifier ?? "global";
  const maxRequests = options.limit ?? options.maxRequests ?? 10;
  const { windowMs } = options;

  const now = Date.now();
  const windowStart = now - windowMs;

  let record = store.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
    const retryAfterSeconds = Math.ceil(resetMs / 1000);
    return {
      ok: false,
      allowed: false,
      remaining: 0,
      resetMs,
      retryAfterSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = maxRequests - record.timestamps.length;
  const retryAfterSeconds = Math.ceil(windowMs / 1000);

  return {
    ok: true,
    allowed: true,
    remaining,
    resetMs: windowMs,
    retryAfterSeconds,
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}

export function assertRateLimit(options: RateLimitOptions): void {
  const result = checkRateLimit(options);
  if (!result.allowed) {
    const seconds = result.retryAfterSeconds;
    throw new TooManyRequestsError(
      `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${seconds} giây.`,
    );
  }
}

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "127.0.0.1";
}
