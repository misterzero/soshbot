/**
 * Sync planner (F1): pure diffing logic between the current DB state and a
 * freshly parsed iCal feed. No I/O — the API route applies the plan.
 *
 * Invariants:
 * - Upserts key on icalUid; local enrichments (entertainerId, payouts, notes)
 *   survive updates.
 * - Events that disappear from the feed are cancelled, never deleted.
 * - New events auto-link to an entertainer at/above AUTO_LINK_THRESHOLD;
 *   below it they land in the review queue (entertainerId = null).
 */
import type { CandidateEvent } from "./ical";
import { AUTO_LINK_THRESHOLD, matchTitle, type MatchCandidate } from "../match/matcher";

export type ExistingEvent = {
  id: string;
  icalUid: string | null;
  calendarSourceId: string | null;
  title: string;
  startsAt: Date;
  endsAt: Date;
  space: string | null;
  status: "draft" | "confirmed" | "cancelled";
  entertainerId: string | null;
};

export type PlannedInsert = {
  icalUid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  space: string | null;
  entertainerId: string | null;
  needsReview: boolean;
};

export type PlannedUpdate = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  space: string | null;
  /** re-activate an event that was cancelled but reappeared in the feed */
  reactivate: boolean;
};

export type SyncPlan = {
  toInsert: PlannedInsert[];
  toUpdate: PlannedUpdate[];
  toCancelIds: string[];
  summary: {
    added: number;
    updated: number;
    cancelled: number;
    autoLinked: number;
    needsReview: number;
    unchanged: number;
  };
};

function changed(e: ExistingEvent, c: CandidateEvent): boolean {
  return (
    e.title !== c.title ||
    e.startsAt.getTime() !== c.startsAt.getTime() ||
    e.endsAt.getTime() !== c.endsAt.getTime() ||
    (e.space ?? null) !== (c.location ?? null)
  );
}

export function planSync(
  sourceId: string,
  existing: ExistingEvent[],
  candidates: CandidateEvent[],
  roster: MatchCandidate[],
  now: Date = new Date()
): SyncPlan {
  const byUid = new Map(existing.filter((e) => e.icalUid).map((e) => [e.icalUid!, e]));
  const seenUids = new Set<string>();

  const toInsert: PlannedInsert[] = [];
  const toUpdate: PlannedUpdate[] = [];
  let autoLinked = 0;
  let needsReview = 0;
  let unchanged = 0;

  for (const c of candidates) {
    seenUids.add(c.icalUid);
    const current = byUid.get(c.icalUid);
    if (!current) {
      const match = matchTitle(c.title, roster);
      const linked = match !== null && match.confidence >= AUTO_LINK_THRESHOLD;
      if (linked) autoLinked++;
      else needsReview++;
      toInsert.push({
        icalUid: c.icalUid,
        title: c.title,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        space: c.location ?? null,
        entertainerId: linked ? match.entertainerId : null,
        needsReview: !linked,
      });
    } else if (changed(current, c) || current.status === "cancelled") {
      toUpdate.push({
        id: current.id,
        title: c.title,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        space: c.location ?? null,
        reactivate: current.status === "cancelled",
      });
    } else {
      unchanged++;
    }
  }

  // Cancel future events from this source that vanished from the feed.
  const toCancelIds = existing
    .filter(
      (e) =>
        e.calendarSourceId === sourceId &&
        e.icalUid &&
        !seenUids.has(e.icalUid) &&
        e.status !== "cancelled" &&
        e.startsAt.getTime() > now.getTime()
    )
    .map((e) => e.id);

  return {
    toInsert,
    toUpdate,
    toCancelIds,
    summary: {
      added: toInsert.length,
      updated: toUpdate.length,
      cancelled: toCancelIds.length,
      autoLinked,
      needsReview,
      unchanged,
    },
  };
}
