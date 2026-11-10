import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Runs public/sw.js against fakes of the worker globals and returns what it
 * registered, so the install and fetch behaviour can be checked without a browser.
 */
const HANG = Symbol("hang");

function loadWorker(options: { responses: Record<string, string | typeof HANG>; cached?: Record<string, string> }) {
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
  const fakeFetch = async (input: string | { url: string }, init?: { signal?: AbortSignal }) => {
    const url = new URL(typeof input === "string" ? abs(input) : input.url);
    fetched.push(url.pathname + url.search);
    const body = options.responses[url.pathname];
    if (body === HANG) {
      // Never answers; only the caller's abort signal ends it.
      return new Promise<never>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
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

  it("keeps a query suffix on a static URL exactly as the page requests it", async () => {
    const worker = loadWorker({
      responses: {
        "/": '<script src="/_next/static/chunks/a.js?dpl=dpl_123"></script><link href="/_next/static/chunks/s.css?dpl=dpl_123">',
        "/_next/static/chunks/a.js": 'e.l("static/chunks/map.js")',
        "/_next/static/chunks/s.css": "",
        "/_next/static/chunks/map.js": "",
      },
    });
    let done: Promise<unknown> = Promise.resolve();
    worker.listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect(worker.fetched).toEqual(
      expect.arrayContaining(["/_next/static/chunks/a.js?dpl=dpl_123", "/_next/static/chunks/s.css?dpl=dpl_123"])
    );
    expect(Array.from(worker.store.keys())).toEqual(
      expect.arrayContaining([
        "https://site.test/_next/static/chunks/a.js?dpl=dpl_123",
        "https://site.test/_next/static/chunks/s.css?dpl=dpl_123",
      ])
    );
    // A script cached with a query is still scanned for the chunks it loads.
    expect(worker.fetched).toContain("/_next/static/chunks/map.js");
  });

  it("caches the on-demand chunks the deployed build names under static/immutable", async () => {
    // Shaped like the production map loader: relative names, immutable/ in the path.
    const loader =
      'Promise.all(["static/immutable/chunks/44ioy7k0geuqh.css","static/immutable/chunks/0xdg_owqy-pnu.js","static/immutable/chunks/3nizdvtm1tal0.js"].map(t=>e.l(t)))';
    const worker = loadWorker({
      responses: {
        "/dashboard": '<script src="/_next/static/immutable/chunks/loader.js"></script>',
        "/_next/static/immutable/chunks/loader.js": loader,
        "/_next/static/immutable/chunks/44ioy7k0geuqh.css": "",
        "/_next/static/immutable/chunks/0xdg_owqy-pnu.js": "",
        "/_next/static/immutable/chunks/3nizdvtm1tal0.js": "",
      },
    });
    let done: Promise<unknown> = Promise.resolve();
    worker.listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    const cached = Array.from(worker.store.keys()).map((k) => new URL(k).pathname);
    expect(cached).toEqual(
      expect.arrayContaining([
        "/_next/static/immutable/chunks/loader.js",
        "/_next/static/immutable/chunks/44ioy7k0geuqh.css",
        "/_next/static/immutable/chunks/0xdg_owqy-pnu.js",
        "/_next/static/immutable/chunks/3nizdvtm1tal0.js",
      ])
    );
  });

  it("still fetches the on-demand chunks when the page has more scripts than the first-level cap", async () => {
    const scripts = Array.from({ length: 70 }, (_, i) => `/_next/static/chunks/s${i}.js`);
    const responses: Record<string, string> = {
      "/dashboard": scripts.map((src) => `<script src="${src}"></script>`).join(""),
      "/_next/static/chunks/lazy.js": "",
    };
    for (const src of scripts) responses[src] = src.endsWith("/s0.js") ? 'e.l("static/chunks/lazy.js")' : "";
    const worker = loadWorker({ responses });
    let done: Promise<unknown> = Promise.resolve();
    worker.listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect(worker.fetched).toContain("/_next/static/chunks/lazy.js");
  });

  describe("when a fetch never answers", () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("gives up after the timeout, keeps what did arrive, and still activates", async () => {
      vi.useFakeTimers();
      // Take the fallback path, which is what an engine without AbortSignal.timeout runs.
      vi.stubGlobal("AbortSignal", {});
      const worker = loadWorker({
        responses: { "/": HANG, "/dashboard": "<p>dashboard</p>", "/wards_hvi.geojson": HANG, "/ward_profiles.json": "{}" },
      });
      let done: Promise<unknown> = Promise.resolve();
      worker.listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
      let settled = false;
      void done.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(11_000);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(2_000);
      await vi.advanceTimersByTimeAsync(13_000);
      await expect(done).resolves.toBeUndefined();
      expect(worker.skipWaiting).toHaveBeenCalled();
      const cached = Array.from(worker.store.keys()).map((k) => new URL(k).pathname);
      expect(cached).toContain("/dashboard");
      expect(cached).toContain("/ward_profiles.json");
      expect(cached).not.toContain("/");
      expect(cached).not.toContain("/wards_hvi.geojson");
    });
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
