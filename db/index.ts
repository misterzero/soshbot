import type { DrizzleD1Database } from "drizzle-orm/d1";
import { isCloudflareWorkers } from "@/lib/runtime";
import * as schema from "./schema";

/**
 * Dual-driver database client:
 * - Local/dev/CI: better-sqlite3 over a .data/ file (sync driver).
 * - Production (Cloudflare Workers): the D1 binding via drizzle-orm/d1.
 *
 * The public type is the async (D1) driver shape — every call site awaits,
 * which is correct for both drivers (better-sqlite3 results are thenable-
 * compatible values). The schema is identical in both environments.
 */
export type AppDb = DrizzleD1Database<typeof schema>;

let _db: AppDb | null = null;

export function getDb(): AppDb {
  if (_db) return _db;

  if (isCloudflareWorkers()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/d1") as typeof import("drizzle-orm/d1");
    const { env } = getCloudflareContext();
    const binding = (env as Record<string, unknown>).DB;
    if (!binding) throw new Error("D1 binding DB missing");
    _db = drizzle(binding as Parameters<typeof drizzle>[0], { schema });
    return _db;
  }

  // Local Node path. The indirect require keeps the native module out of the
  // Workers bundle (it is also listed in serverExternalPackages for Next).
  const req = eval("require") as NodeRequire;
  const Database = req("better-sqlite3");
  const { drizzle } = req("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
  const { existsSync, mkdirSync } = req("node:fs") as typeof import("node:fs");

  if (!existsSync(".data")) mkdirSync(".data", { recursive: true });
  const sqlite = new Database(".data/soshbot.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  _db = drizzle(sqlite, { schema }) as unknown as AppDb;
  return _db;
}

export { schema };
