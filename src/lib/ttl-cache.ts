/**
 * Single-flight TTL cache for read-heavy aggregate queries (dashboards,
 * reports) that do not need to be perfectly fresh.
 *
 * - The in-flight promise is cached, so N concurrent misses issue one DB query.
 * - Failed loads are evicted so errors are never served stale.
 * - Store is per-process; across instances the DB absorbs a per-`garageId` miss
 *   every TTL, which is negligible at this scale.
 */
export function createTtlCache<T>(ttlMs: number) {
  const store = new Map<string, { expiresAt: number; value: Promise<T> }>();

  return {
    getOrSet(key: string, load: () => Promise<T>): Promise<T> {
      const entry = store.get(key);
      if (entry && Date.now() < entry.expiresAt) return entry.value;

      const value = load().catch((err) => {
        store.delete(key);
        throw err;
      });
      store.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    },
  };
}
