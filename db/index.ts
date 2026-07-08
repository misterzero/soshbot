import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import * as schema from "./schema";

/**
 * Local/dev database client (better-sqlite3).
 * In production on Cloudflare Workers this is swapped for the D1 binding
 * via drizzle-orm/d1 (M4 — see docs/ROADMAP.md); the schema is identical.
 */

const DB_DIR = ".data";
const DB_PATH = `${DB_DIR}/soshbot.db`;

let _db: BetterSQLite3Database<typeof schema> | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export { schema };
