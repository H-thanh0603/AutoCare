import { TooManyRequestsError } from "./errors";

export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },
  REGISTER: { limit: 3, windowMs: 60 * 60 * 1000 },
  MEDIA_UPLOAD: { limit: 20, windowMs: 60 * 1000 },
  PUBLIC_SHARE: { limit: 30, windowMs: 60 * 1000 },
  /** Customer booking actions on the portal (create/cancel/reschedule). */
  PORTAL_BOOKING: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Customer decisions on sent quotations (approve/reject items). */
  PORTAL_QUOTATION: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const;

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

// ---------------------------------------------------------------------------
// In-memory fallback store
//
// Used for local development, tests, and as a safety net when Redis is
// unavailable. It is per-process, so it does NOT enforce limits across multiple
// instances — configure REDIS_URL in any multi-instance / serverless setup.
// ---------------------------------------------------------------------------

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

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

function checkInMemory(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = store.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
    return {
      ok: false,
      allowed: false,
      remaining: 0,
      resetMs,
      retryAfterSeconds: Math.ceil(resetMs / 1000),
    };
  }

  record.timestamps.push(now);
  const remaining = maxRequests - record.timestamps.length;

  return {
    ok: true,
    allowed: true,
    remaining,
    resetMs: windowMs,
    retryAfterSeconds: Math.ceil(windowMs / 1000),
  };
}

// ---------------------------------------------------------------------------
// Distributed store (Redis, sliding-window log via a sorted set)
//
// ioredis is loaded lazily so it is only required when REDIS_URL is set, and so
// it is never pulled into edge bundles. Any Redis error falls back to the
// in-memory store rather than failing the request open.
// ---------------------------------------------------------------------------

interface RedisPipeline {
  zremrangebyscore(key: string, min: number, max: number): RedisPipeline;
  zadd(key: string, score: number, member: string): RedisPipeline;
  zcard(key: string): RedisPipeline;
  pexpire(key: string, ms: number): RedisPipeline;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}

interface RedisLike {
  multi(): RedisPipeline;
  zrem(key: string, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number, withScores: "WITHSCORES"): Promise<string[]>;
  del(key: string): Promise<number>;
}

let redisPromise: Promise<RedisLike | null> | null = null;

async function getRedis(): Promise<RedisLike | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redisPromise) {
    redisPromise = (async () => {
      try {
        const { default: Redis } = await import("ioredis");
        const client = new Redis(url, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: false,
        });
        // Swallow connection errors; each command falls back independently.
        client.on("error", () => {});
        return client as unknown as RedisLike;
      } catch {
        return null;
      }
    })();
  }
  return redisPromise;
}

function redisKey(identifier: string): string {
  return `ratelimit:${identifier}`;
}

/** Returns null to signal the caller should fall back to the in-memory store. */
async function checkRedis(
  client: RedisLike,
  identifier: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = redisKey(identifier);
    const member = `${now}:${Math.random().toString(36).slice(2)}`;

    const results = await client
      .multi()
      .zremrangebyscore(key, 0, windowStart)
      .zadd(key, now, member)
      .zcard(key)
      .pexpire(key, windowMs)
      .exec();

    if (!results) return null;
    const count = Number(results[2]?.[1] ?? 0);

    if (count > maxRequests) {
      // Mirror the in-memory store, which does not record an attempt that is
      // already over the limit, so a burst cannot keep extending the window.
      await client.zrem(key, member);
      const oldest = await client.zrange(key, 0, 0, "WITHSCORES");
      const oldestScore = oldest.length >= 2 ? Number(oldest[1]) : now;
      const resetMs = Math.max(0, oldestScore + windowMs - now);
      return {
        ok: false,
        allowed: false,
        remaining: 0,
        resetMs,
        retryAfterSeconds: Math.ceil(resetMs / 1000),
      };
    }

    return {
      ok: true,
      allowed: true,
      remaining: Math.max(0, maxRequests - count),
      resetMs: windowMs,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const identifier = options.key ?? options.identifier ?? "global";
  const maxRequests = options.limit ?? options.maxRequests ?? 10;
  const { windowMs } = options;

  const client = await getRedis();
  if (client) {
    const result = await checkRedis(client, identifier, maxRequests, windowMs);
    if (result) return result;
  }

  return checkInMemory(identifier, maxRequests, windowMs);
}

export async function resetRateLimit(key: string): Promise<void> {
  store.delete(key);
  const client = await getRedis();
  if (client) {
    try {
      await client.del(redisKey(key));
    } catch {
      // Best effort; the in-memory copy is already cleared.
    }
  }
}

export async function assertRateLimit(options: RateLimitOptions): Promise<void> {
  const result = await checkRateLimit(options);
  if (!result.allowed) {
    const seconds = result.retryAfterSeconds;
    throw new TooManyRequestsError(
      `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${seconds} giây.`,
    );
  }
}

export function getClientIp(request: Request): string {
  return resolveClientIp(request.headers);
}

/**
 * Resolves the caller's IP from forwarding headers in a spoof-resistant way.
 *
 * `X-Forwarded-For` is built left-to-right as `client, proxy1, proxy2, ...`; a
 * client can prepend arbitrary values, so the *leftmost* entry is attacker
 * controlled. Trusted proxies append the real peer on the right, so we read
 * from the right, skipping `TRUSTED_PROXY_COUNT` internal hops. Default 0 means
 * "take the rightmost entry", correct for a single trusted reverse proxy.
 */
export function resolveClientIp(headers: {
  get(name: string): string | null;
}): string {
  const trustedProxyCount = Math.max(
    0,
    Number.parseInt(process.env.TRUSTED_PROXY_COUNT ?? "0", 10) || 0,
  );

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (ips.length > 0) {
      const index = Math.max(0, ips.length - 1 - trustedProxyCount);
      return ips[index];
    }
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "127.0.0.1";
}
