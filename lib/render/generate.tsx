/**
 * Asset generation orchestrator: gathers event/brand data from the DB,
 * renders PNGs via the pipeline, writes them to disk, and records asset rows.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { buildDailyCaption, buildWeeklyCaption } from "./caption";
import { renderPng, PLATFORM_SIZES, type AssetType, type Platform } from "./pipeline";
import { DailyPost, MonthlyCalendar, WeeklyLineup, DEFAULT_COLORS, type MonthCell } from "./templates";

const ASSETS_DIR = ".data/assets";
const DAY_MS = 86_400_000;

async function photoDataUri(entertainerId: string | null): Promise<string | null> {
  if (!entertainerId) return null;
  const db = getDb();
  const items = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.entertainerId, entertainerId));
  const pick = items.find((m) => m.isDefault && m.kind === "promo") ?? items.find((m) => m.kind === "promo");
  if (!pick) return null;
  try {
    const buf = await readFile(`.data/media/${pick.path}`);
    return `data:${pick.mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function saveAsset(
  png: Buffer,
  type: AssetType,
  platform: Platform,
  caption: string,
  venueId: string
): Promise<string> {
  const db = getDb();
  const id = randomUUID();
  mkdirSync(ASSETS_DIR, { recursive: true });
  await writeFile(`${ASSETS_DIR}/${id}.png`, png);
  await db.insert(schema.assets).values({
    id,
    venueId,
    type,
    platform,
    imagePath: `${id}.png`,
    caption,
    generatedAt: new Date(),
  });
  return id;
}

export async function generateAsset(
  type: AssetType,
  platform: Platform,
  eventId?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const db = getDb();
  const venue = await db.query.venues.findFirst();
  if (!venue) return { ok: false, error: "No venue configured" };

  const brandKit = await db.query.brandKits.findFirst({
    where: eq(schema.brandKits.venueId, venue.id),
  });
  const colors = brandKit?.colors ?? DEFAULT_COLORS;
  const hashtags = brandKit?.hashtags ?? [];
  const brand = { venueName: venue.name, hashtags };
  const size = PLATFORM_SIZES[platform];
  const tz = venue.timezone;

  const now = new Date();

  if (type === "daily") {
    const event = eventId
      ? await db.query.events.findFirst({ where: eq(schema.events.id, eventId) })
      : await db.query.events.findFirst({
          where: and(ne(schema.events.status, "cancelled"), gt(schema.events.startsAt, now)),
          orderBy: (e, { asc }) => [asc(e.startsAt)],
        });
    if (!event) return { ok: false, error: "No upcoming event to promote" };

    const act = event.entertainerId
      ? await db.query.entertainers.findFirst({ where: eq(schema.entertainers.id, event.entertainerId) })
      : null;

    const whenLine = new Intl.DateTimeFormat("en-US", {
      weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz,
    }).format(event.startsAt);

    const png = await renderPng(
      <DailyPost
        actName={act?.name ?? event.title}
        hook={act?.bioShort ?? null}
        whenLine={whenLine}
        space={event.space}
        venueName={venue.name}
        colors={colors}
        photoDataUri={await photoDataUri(event.entertainerId)}
        size={size}
      />,
      platform
    );
    const caption = buildDailyCaption(
      { title: event.title, startsAt: event.startsAt, space: event.space },
      act ? { name: act.name, bioShort: act.bioShort, socials: act.socials } : null,
      brand,
      tz
    );
    return { ok: true, id: await saveAsset(png, type, platform, caption, venue.id) };
  }

  if (type === "weekly") {
    const weekEnd = new Date(now.getTime() + 7 * DAY_MS);
    const events = (
      await db
        .select()
        .from(schema.events)
        .where(and(ne(schema.events.status, "cancelled"), gt(schema.events.startsAt, now), lt(schema.events.startsAt, weekEnd)))
    ).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const roster = await db.select().from(schema.entertainers);
    const actName = new Map(roster.map((e) => [e.id, e.name]));

    const rows = events.map((e) => ({
      day: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(e.startsAt),
      act: (e.entertainerId ? actName.get(e.entertainerId) : null) ?? e.title,
    }));

    const png = await renderPng(
      <WeeklyLineup rows={rows} venueName={venue.name} colors={colors} size={size} />,
      platform
    );
    const caption = buildWeeklyCaption(
      events.map((e) => ({
        event: { title: e.title, startsAt: e.startsAt, space: e.space },
        entertainer: e.entertainerId ? { name: actName.get(e.entertainerId) ?? e.title } : null,
      })),
      brand,
      tz
    );
    return { ok: true, id: await saveAsset(png, type, platform, caption, venue.id) };
  }

  // monthly: current calendar month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const events = await db
    .select()
    .from(schema.events)
    .where(and(ne(schema.events.status, "cancelled"), gt(schema.events.startsAt, monthStart), lt(schema.events.startsAt, nextMonth)));
  const roster = await db.select().from(schema.entertainers);
  const actName = new Map(roster.map((e) => [e.id, e.name]));

  const byDay = new Map<number, string>();
  for (const e of events) {
    const day = e.startsAt.getDate();
    if (!byDay.has(day)) {
      byDay.set(day, (e.entertainerId ? actName.get(e.entertainerId) : null) ?? e.title);
    }
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDow = monthStart.getDay();
  const weeks: MonthCell[][] = [];
  let week: MonthCell[] = Array.from({ length: firstDow }, () => ({ day: null, hasEvent: false, label: null }));
  for (let day = 1; day <= daysInMonth; day++) {
    week.push({ day, hasEvent: byDay.has(day), label: byDay.get(day) ?? null });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ day: null, hasEvent: false, label: null });
    weeks.push(week);
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now);
  const png = await renderPng(
    <MonthlyCalendar monthLabel={monthLabel} weeks={weeks} venueName={venue.name} colors={colors} size={size} />,
    platform
  );
  const caption = [
    `${monthLabel} at ${venue.name}: ${events.length} live event${events.length === 1 ? "" : "s"} on the calendar.`,
    hashtags.join(" "),
  ]
    .filter(Boolean)
    .join("\n");
  return { ok: true, id: await saveAsset(png, "monthly", platform, caption, venue.id) };
}
