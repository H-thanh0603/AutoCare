/* AutoCare service worker.
 *
 * Caching policy (privacy-safe):
 * - NEVER cache authenticated HTML pages or API responses. Caching dashboard
 *   HTML would leak garage A's data to whoever uses the device next and serve
 *   stale private data.
 * - Cache-first: only versioned static assets (/_next/static/*), fonts, icons.
 * - Navigations: network-first, fall back to the public /offline page.
 * - API/auth/PDF: never intercepted (let the request hit the network).
 */

const CACHE_NAME = "autocare-static-v2";
const OFFLINE_URL = "/offline";

// Best-effort precache: a single missing asset must not fail install.
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url).then((res) => {
              if (res.ok) return cache.put(url, res);
              throw new Error(`Precache skipped: ${url} (${res.status})`);
            }),
          ),
        ),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname === "/manifest.json" ||
    /\.(js|css|png|jpg|jpeg|webp|avif|gif|ico|svg|woff2?)$/.test(pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Never cache API, auth, or generated PDFs.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first -> offline fallback. Never serve cached
  // authenticated HTML.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ??
            new Response("Không có kết nối mạng. Vui lòng thử lại sau.", {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }),
        ),
      ),
    );
    return;
  }

  // Static assets: cache-first with network fallback.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
  }
});
