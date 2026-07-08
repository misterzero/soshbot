/**
 * Custom Workers entry: wraps the OpenNext-generated handler and adds a
 * scheduled() handler so the hourly Cron Trigger (wrangler.toml) drives the
 * iCal sync (F1) by invoking the app's own /api/sync route.
 *
 * `.open-next/worker.js` is produced by `opennextjs-cloudflare build`.
 */
// @ts-expect-error — generated at build time by opennextjs-cloudflare
import openNextHandler from "./.open-next/worker.js";

interface Env {
  WORKER_SELF_REFERENCE: { fetch: typeof fetch };
}

export default {
  fetch: openNextHandler.fetch,

  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(
      env.WORKER_SELF_REFERENCE.fetch("https://internal/api/sync", { method: "POST" })
    );
  },
} satisfies {
  fetch: unknown;
  scheduled: unknown;
};

// Re-export Durable Object classes OpenNext may define (cache purge etc.)
export * from "./.open-next/worker.js";
