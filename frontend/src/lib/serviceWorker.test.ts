import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * Runs public/sw.js against fakes of the worker globals and returns what it
 * registered, so the install and fetch behaviour can be checked without a browser.
 */
function loadWorker(options: { responses: Record<string, string>; cached?: Record<string, string> }) {
  const source = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
  const listeners: Record<string, (event: unknown) => void> = {};
  const store = new Map<string, string>(Object.entries(options.cached ?? {}));
  const fetched: string[] = [];

  const abs = (path: string) => new URL(path, "https://site.test").href;
  const cache = {
    put: async (request: string | { url: string }, response: { text: () => Promise<string> }) => {
      store.set(typeof request === "string" ? abs(request) : request.url, await response.text());
    },
    match: async (request: string | { url: string }, opts?: { ignoreSearch?: boolean }) => {
      const url = new URL(typeof request === "string" ? abs(request) : request.url);
      for (const [key, body] of store) {
        const k = new URL(key);
        const same = opts?.ignoreSearch ? k.origin + k.pathname === url.origin + url.pathname : key === url.href;
        if (same) return { body };
      }
      return undefined;
    },
  };
  const fakeFetch = async (input: string | { url: string }) => {
    const url = new URL(typeof input === "string" ? abs(input) : input.url);
    fetched.push(url.pathname);
    const body = options.responses[url.pathname];
    if (body === undefined) throw new Error("offline");
    return { ok: true, url: url.href, text: async () => body, clone() { return this; } };
  };
  const skipWaiting = vi.fn();
  const self = {
    location: { origin: "https://site.test" },
    skipWaiting,
    clients: { claim: vi.fn() },
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners[type] = fn;
    },
  };
  const caches = { open: async () => cache, keys: async () => [], delete: async () => true };
  const Response = { error: () => ({ error: true }) };
  new Function("self", "caches", "fetch", "Response", source)(self, caches, fakeFetch, Response);
  return { listeners, store, fetched, skipWaiting };
}

const PAGE = `<script src="/_next/static/chunks/a.js"></script><link href="/_next/static/chunks/s.css">
  <script>self.__next_f.push([1,"[\\"/_next/static/chunks/b.js\\"]"])</script>`;

describe("service worker install", () => {
  it("caches the home page, the dashboard, their scripts and the chunks those scripts load", async () => {
    const worker = loadWorker({
      responses: {
        "/": PAGE,
        "/dashboard": PAGE,
        "/_next/static/chunks/a.js": 'e.l("static/chunks/map.js")',
        "/_next/static/chunks/map.js": "",
        "/_next/static/chunks/b.js": "",
        "/_next/static/chunks/s.css": "",
        "/wards_hvi.geojson": "{}",
      },
    });
    let done: Promise<unknown> = Promise.resolve();
    worker.listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    const cached = Array.from(worker.store.keys()).map((k) => new URL(k).pathname);
    expect(cached).toEqual(
      expect.arrayContaining([
        "/",
        "/dashboard",
        "/_next/static/chunks/a.js",
        "/_next/static/chunks/b.js",
        "/_next/static/chunks/s.css",
        "/_next/static/chunks/map.js",
        "/wards_hvi.geojson",
      ])
    );
    expect(worker.skipWaiting).toHaveBeenCalled();
  });

  it("still installs, and activates, when every fetch fails", async () => {
    const worker = loadWorker({ responses: {} });
    let done: Promise<unknown> = Promise.resolve();
    worker.listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await expect(done).resolves.toBeUndefined();
    expect(worker.skipWaiting).toHaveBeenCalled();
  });

  it("never fetches under /api/, whatever the markup mentions", async () => {
    const worker = loadWorker({ responses: { "/": '<a href="/api/v1/wards">' } });
    let done: Promise<unknown> = Promise.resolve();
    worker.listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect(worker.fetched.some((p) => p.startsWith("/api/"))).toBe(false);
  });
});

describe("service worker offline navigation", () => {
  async function navigate(worker: ReturnType<typeof loadWorker>, url: string, mode: string) {
    let reply: Promise<unknown> = Promise.resolve();
    worker.listeners.fetch({
      request: { url, method: "GET", mode },
      respondWith: (p: Promise<unknown>) => (reply = p),
    });
    return (await reply) as { body?: string; error?: boolean };
  }

  const cached = { "https://site.test/dashboard": "dashboard html" };

  it("opens the cached dashboard for the dashboard with a query string", async () => {
    const worker = loadWorker({ responses: {}, cached });
    expect((await navigate(worker, "https://site.test/dashboard?ward=F%2FN", "navigate")).body).toBe("dashboard html");
  });

  it("does not answer an unrelated route with the dashboard", async () => {
    const worker = loadWorker({ responses: {}, cached });
    expect((await navigate(worker, "https://site.test/methodology", "navigate")).error).toBe(true);
  });

  it("matches a query-string URL exactly for requests that are not navigations", async () => {
    const worker = loadWorker({ responses: {}, cached });
    expect((await navigate(worker, "https://site.test/dashboard?_rsc=abc", "cors")).error).toBe(true);
  });
});
