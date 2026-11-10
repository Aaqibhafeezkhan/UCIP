// Service worker: lets UCIP install as a web app and reopen offline. Same-origin
// GET requests try the network first and fall back to the last good copy kept in
// the cache. /api/ and other origins are never intercepted, so weather and ward
// lookups always go to the network.
const CACHE = "ucip-v3";

// What the installed app needs to launch with no network on its first run. The
// cache is keyed by exact URL, so a visit to /dashboard?ward=F%2FN never warms
// the bare /dashboard that start_url opens, and a new cache name starts empty.
// So install fetches these itself. Every step tolerates a miss: a failed fetch
// skips that file and never fails the install.
const PRECACHE_PAGES = ["/", "/dashboard"];
// Static files the dashboard falls back to when /api is unreachable, which
// offline it always is: ward polygons and scores, recommendations, profiles,
// rank intervals, trend series.
const PRECACHE_DATA = [
  "/wards_hvi.geojson",
  "/nbs_recommendations.json",
  "/ward_profiles.json",
  "/hvi_uncertainty.json",
  "/ward_timeseries.json",
];
const MAX_PRECACHED_ASSETS = 60;
// Script, style and font URLs inside a page's markup and its inlined payload.
const PAGE_ASSET = /\/_next\/static\/[^"'\s\\)<>]+?\.(?:js|css|woff2)/g;
// Chunks a script loads on demand (the map) are named without the /_next/ prefix.
const SCRIPT_ASSET = /static\/(?:chunks|media)\/[A-Za-z0-9_.~-]+\.(?:js|css|woff2)/g;

async function store(cache, path, options) {
  try {
    const response = await fetch(path, options);
    if (!response.ok) return null;
    await cache.put(path, response.clone());
    return response;
  } catch {
    return null;
  }
}

async function precache() {
  const cache = await caches.open(CACHE);
  const assets = new Set();

  // A page without its scripts does not hydrate, so each page's own scripts
  // and styles are cached with it.
  await Promise.all(
    PRECACHE_PAGES.map(async (path) => {
      const response = await store(cache, path, { cache: "reload" });
      if (!response) return;
      try {
        for (const url of (await response.text()).match(PAGE_ASSET) ?? []) assets.add(url);
      } catch {
        // Unreadable body: keep the page, skip its assets.
      }
    })
  );

  // One level down, for the chunks those scripts pull in when they run.
  const first = Array.from(assets).slice(0, MAX_PRECACHED_ASSETS);
  const loaded = await Promise.all(first.map((url) => store(cache, url)));
  for (const response of loaded) {
    if (!response || !response.url.endsWith(".js")) continue;
    try {
      for (const match of (await response.text()).match(SCRIPT_ASSET) ?? []) assets.add(`/_next/${match}`);
    } catch {
      // Same: skip.
    }
  }
  const second = Array.from(assets).filter((url) => !first.includes(url));
  await Promise.all(second.slice(0, Math.max(0, MAX_PRECACHED_ASSETS - first.length)).map((url) => store(cache, url)));

  await Promise.all(PRECACHE_DATA.map((path) => store(cache, path)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const exact = await cache.match(request);
    if (exact) return exact;
    // A page opened with a query string (the dashboard's ?ward=, ?layer=, map
    // position) is the same document as the bare page. Navigations only, and
    // only the same path, so no route is ever answered with another page.
    if (request.mode === "navigate") {
      const sameDocument = await cache.match(request, { ignoreSearch: true });
      if (sameDocument) return sameDocument;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(networkFirst(request));
});
