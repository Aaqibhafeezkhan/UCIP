import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken || !host) {
  if (process.env.NODE_ENV === "development") {
    console.info(
      "PostHog analytics are off: NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST are not both set. They are optional for local development.",
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    // No cookie or browser storage, so no consent banner is needed for it.
    persistence: "memory",
    debug: process.env.NODE_ENV === "development",
  });
  posthog.register({ site: "ucip" });
}
