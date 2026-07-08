import { describe, expect, it } from "vitest";
import { planSync, type ExistingEvent } from "./engine";
import type { CandidateEvent } from "./ical";

const ROSTER = [
  { id: "ent-1", name: "The Hi-Tones", matchAliases: ["Hi Tones"] },
  { id: "ent-2", name: "Marlene & the Moonshiners", matchAliases: ["Moonshiners"] },
];

const NOW = new Date("2026-08-01T00:00:00Z");

function candidate(uid: string, title: string, startIso: string): CandidateEvent {
  const startsAt = new Date(startIso);
  return { icalUid: uid, title, startsAt, endsAt: new Date(startsAt.getTime() + 3 * 3_600_000) };
}

function existing(partial: Partial<ExistingEvent> & { id: string; icalUid: string }): ExistingEvent {
  return {
    calendarSourceId: "src-1",
    title: partial.id,
    startsAt: new Date("2026-08-10T20:00Z"),
    endsAt: new Date("2026-08-10T23:00Z"),
    space: null,
    status: "confirmed",
    entertainerId: null,
    ...partial,
  };
}

describe("planSync", () => {
  it("inserts new events, auto-linking confident matches", () => {
    const plan = planSync(
      "src-1",
      [],
      [candidate("u1", "The Hi-Tones LIVE", "2026-08-10T20:00Z"), candidate("u2", "Mystery Guest", "2026-08-11T20:00Z")],
      ROSTER,
      NOW
    );
    expect(plan.summary.added).toBe(2);
    expect(plan.summary.autoLinked).toBe(1);
    expect(plan.summary.needsReview).toBe(1);
    expect(plan.toInsert[0].entertainerId).toBe("ent-1");
    expect(plan.toInsert[1].entertainerId).toBeNull();
    expect(plan.toInsert[1].needsReview).toBe(true);
  });

  it("updates changed events and leaves unchanged ones alone", () => {
    const cur = existing({
      id: "e1",
      icalUid: "u1",
      title: "The Hi-Tones LIVE",
      startsAt: new Date("2026-08-10T20:00Z"),
      endsAt: new Date("2026-08-10T23:00Z"),
      entertainerId: "ent-1",
    });
    // same event, moved one hour later
    const moved = candidate("u1", "The Hi-Tones LIVE", "2026-08-10T21:00Z");
    const plan = planSync("src-1", [cur], [moved], ROSTER, NOW);
    expect(plan.summary.updated).toBe(1);
    expect(plan.summary.added).toBe(0);
    expect(plan.toUpdate[0].id).toBe("e1");

    const samePlan = planSync(
      "src-1",
      [cur],
      [{ ...moved, startsAt: cur.startsAt, endsAt: cur.endsAt }],
      ROSTER,
      NOW
    );
    expect(samePlan.summary.updated).toBe(0);
    expect(samePlan.summary.unchanged).toBe(1);
  });

  it("cancels future events that vanished from the feed, but not past ones", () => {
    const future = existing({ id: "e-future", icalUid: "u-future", startsAt: new Date("2026-08-20T20:00Z") });
    const past = existing({ id: "e-past", icalUid: "u-past", startsAt: new Date("2026-07-20T20:00Z") });
    const plan = planSync("src-1", [future, past], [], ROSTER, NOW);
    expect(plan.toCancelIds).toEqual(["e-future"]);
  });

  it("does not cancel events belonging to another source or manual events", () => {
    const otherSource = existing({ id: "e-other", icalUid: "u-o", calendarSourceId: "src-2", startsAt: new Date("2026-08-20T20:00Z") });
    const manual = { ...existing({ id: "e-manual", icalUid: "u-m", startsAt: new Date("2026-08-20T20:00Z") }), calendarSourceId: null };
    const plan = planSync("src-1", [otherSource, manual], [], ROSTER, NOW);
    expect(plan.toCancelIds).toEqual([]);
  });

  it("reactivates a cancelled event that reappears", () => {
    const cancelled = existing({ id: "e1", icalUid: "u1", status: "cancelled", title: "The Hi-Tones LIVE" });
    const plan = planSync(
      "src-1",
      [cancelled],
      [{ icalUid: "u1", title: "The Hi-Tones LIVE", startsAt: cancelled.startsAt, endsAt: cancelled.endsAt }],
      ROSTER,
      NOW
    );
    expect(plan.summary.updated).toBe(1);
    expect(plan.toUpdate[0].reactivate).toBe(true);
  });
});
