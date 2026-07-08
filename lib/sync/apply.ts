/**
 * Applies a SyncPlan to the database and orchestrates a full sync run
 * across all calendar sources. Used by both the API route and the
 * dashboard "Sync now" action (and the Cron Trigger in M4).
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { parseEventsFromIcs } from "./ical";
import { fetchIcsFeed, FeedFetchError } from "./fetcher";
import { planSync, type SyncPlan } from "./engine";

export type SourceSyncResult = {
  sourceId: string;
  icalUrl: string;
  ok: boolean;
  error?: string;
  summary?: SyncPlan["summary"];
};

export async function applyPlan(
  plan: SyncPlan,
  venueId: string,
  sourceId: string
): Promise<void> {
  const db = getDb();
  for (const ins of plan.toInsert) {
    await db.insert(schema.events).values({
      id: crypto.randomUUID(),
      venueId,
      calendarSourceId: sourceId,
      icalUid: ins.icalUid,
      title: ins.title,
      startsAt: ins.startsAt,
      endsAt: ins.endsAt,
      space: ins.space,
      status: "confirmed",
      entertainerId: ins.entertainerId,
    });
  }
  for (const upd of plan.toUpdate) {
    await db
      .update(schema.events)
      .set({
        title: upd.title,
        startsAt: upd.startsAt,
        endsAt: upd.endsAt,
        space: upd.space,
        ...(upd.reactivate ? { status: "confirmed" as const } : {}),
      })
      .where(eq(schema.events.id, upd.id));
  }
  for (const id of plan.toCancelIds) {
    await db.update(schema.events).set({ status: "cancelled" }).where(eq(schema.events.id, id));
  }
}

export async function syncAllSources(): Promise<SourceSyncResult[]> {
  const db = getDb();
  const venue = await db.query.venues.findFirst();
  if (!venue) return [];

  const sources = await db.select().from(schema.calendarSources);
  const roster = await db.select().from(schema.entertainers);
  const results: SourceSyncResult[] = [];

  for (const source of sources) {
    try {
      const ics = await fetchIcsFeed(source.icalUrl);
      const candidates = parseEventsFromIcs(ics);
      const existing = await db.select().from(schema.events);
      const plan = planSync(source.id, existing, candidates, roster);
      await applyPlan(plan, venue.id, source.id);
      await db
        .update(schema.calendarSources)
        .set({ lastSyncedAt: new Date(), syncStatus: "ok" })
        .where(eq(schema.calendarSources.id, source.id));
      results.push({ sourceId: source.id, icalUrl: source.icalUrl, ok: true, summary: plan.summary });
    } catch (err) {
      await db
        .update(schema.calendarSources)
        .set({ lastSyncedAt: new Date(), syncStatus: "error" })
        .where(eq(schema.calendarSources.id, source.id));
      results.push({
        sourceId: source.id,
        icalUrl: source.icalUrl,
        ok: false,
        error: err instanceof FeedFetchError ? err.message : "Sync failed",
      });
    }
  }
  return results;
}
