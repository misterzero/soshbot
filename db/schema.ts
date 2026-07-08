import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Schema notes (see docs/ARCHITECTURE.md for the ERD):
 * - `events.icalUid` is the sync anchor: re-syncs upsert on it so local
 *   enrichments (entertainer link, payouts) survive.
 * - `venues` exists from day one so multi-tenant later is a migration,
 *   not a rewrite.
 * - Timestamps are unix epoch ms (integer mode "timestamp_ms").
 */

export const venues = sqliteTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  monthlyBudget: real("monthly_budget").notNull().default(0),
});

export const brandKits = sqliteTable("brand_kits", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id),
  logoPath: text("logo_path"),
  colors: text("colors", { mode: "json" }).$type<{
    primary: string;
    secondary: string;
    background: string;
  }>(),
  fonts: text("fonts", { mode: "json" }).$type<{ heading: string; body: string }>(),
  voiceSample: text("voice_sample"),
  hashtags: text("hashtags", { mode: "json" }).$type<string[]>(),
});

export const calendarSources = sqliteTable("calendar_sources", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id),
  icalUrl: text("ical_url").notNull(),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
  syncStatus: text("sync_status", { enum: ["ok", "error", "never"] })
    .notNull()
    .default("never"),
});

export const entertainers = sqliteTable("entertainers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  genre: text("genre"),
  bioShort: text("bio_short"),
  bioLong: text("bio_long"),
  website: text("website"),
  socials: text("socials", { mode: "json" }).$type<Record<string, string>>(),
  standardRate: real("standard_rate"),
  payoutMethod: text("payout_method"),
  matchAliases: text("match_aliases", { mode: "json" }).$type<string[]>(),
  bookingNotes: text("booking_notes"),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  entertainerId: text("entertainer_id")
    .notNull()
    .references(() => entertainers.id),
  kind: text("kind", { enum: ["logo", "promo"] }).notNull(),
  path: text("path").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id),
  icalUid: text("ical_uid").unique(),
  title: text("title").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
  space: text("space"),
  status: text("status", { enum: ["draft", "confirmed", "cancelled"] })
    .notNull()
    .default("draft"),
  entertainerId: text("entertainer_id").references(() => entertainers.id),
  notes: text("notes"),
});

export const payouts = sqliteTable("payouts", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  amount: real("amount").notNull(),
  status: text("status", { enum: ["pending", "paid"] })
    .notNull()
    .default("pending"),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  venueId: text("venue_id")
    .notNull()
    .references(() => venues.id),
  type: text("type", { enum: ["monthly", "weekly", "daily"] }).notNull(),
  platform: text("platform", {
    enum: ["ig_square", "ig_story", "fb_landscape"],
  }).notNull(),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" }).notNull(),
});
