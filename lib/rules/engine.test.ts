import { describe, expect, it } from "vitest";
import {
  detectBudgetOverruns,
  detectConflicts,
  detectGaps,
  detectVarietyIssues,
  evaluate,
  type BookingRules,
  type RuleEvent,
} from "./engine";

const RULES: BookingRules = {
  targetDays: [5, 6], // Fri, Sat
  horizonWeeks: 2,
  varietyMaxRepeats: 2,
  varietyWindowDays: 14,
  monthlyBudget: 2000,
};

function evt(partial: Partial<RuleEvent> & { id: string; startsAt: Date; endsAt: Date }): RuleEvent {
  return { title: partial.id, space: "main stage", entertainerId: null, status: "confirmed", ...partial };
}

function d(iso: string): Date {
  return new Date(iso);
}

describe("detectConflicts", () => {
  it("flags overlapping events in the same space", () => {
    const alerts = detectConflicts([
      evt({ id: "a", startsAt: d("2026-08-01T20:00Z"), endsAt: d("2026-08-01T23:00Z") }),
      evt({ id: "b", startsAt: d("2026-08-01T21:00Z"), endsAt: d("2026-08-02T00:00Z") }),
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("CONFLICT");
    expect(alerts[0].eventIds).toEqual(["a", "b"]);
  });

  it("ignores overlaps in different spaces", () => {
    const alerts = detectConflicts([
      evt({ id: "a", startsAt: d("2026-08-01T20:00Z"), endsAt: d("2026-08-01T23:00Z"), space: "main stage" }),
      evt({ id: "b", startsAt: d("2026-08-01T21:00Z"), endsAt: d("2026-08-02T00:00Z"), space: "patio" }),
    ]);
    expect(alerts).toHaveLength(0);
  });

  it("treats unknown space as a potential conflict", () => {
    const alerts = detectConflicts([
      evt({ id: "a", startsAt: d("2026-08-01T20:00Z"), endsAt: d("2026-08-01T23:00Z"), space: null }),
      evt({ id: "b", startsAt: d("2026-08-01T21:00Z"), endsAt: d("2026-08-02T00:00Z"), space: "patio" }),
    ]);
    expect(alerts).toHaveLength(1);
  });

  it("ignores cancelled events and back-to-back bookings", () => {
    const alerts = detectConflicts([
      evt({ id: "a", startsAt: d("2026-08-01T18:00Z"), endsAt: d("2026-08-01T20:00Z") }),
      evt({ id: "b", startsAt: d("2026-08-01T20:00Z"), endsAt: d("2026-08-01T22:00Z") }), // touches, no overlap
      evt({ id: "c", startsAt: d("2026-08-01T19:00Z"), endsAt: d("2026-08-01T21:00Z"), status: "cancelled" }),
    ]);
    expect(alerts).toHaveLength(0);
  });
});

describe("detectGaps", () => {
  // Fri 2026-08-07, Sat 2026-08-08 within a 1-week horizon of Mon 2026-08-03
  const now = d("2026-08-03T12:00Z");
  const oneWeek = { ...RULES, horizonWeeks: 1 };

  it("flags unbooked target days", () => {
    const alerts = detectGaps([], oneWeek, now);
    expect(alerts).toHaveLength(2); // Friday and Saturday both empty
    expect(alerts.every((a) => a.type === "GAP")).toBe(true);
  });

  it("does not flag booked target days", () => {
    const friday = evt({ id: "f", startsAt: d("2026-08-07T20:00Z"), endsAt: d("2026-08-07T23:00Z") });
    const alerts = detectGaps([friday], oneWeek, now);
    expect(alerts).toHaveLength(1); // only Saturday
    expect(alerts[0].message).toContain("Saturday");
  });
});

describe("detectVarietyIssues", () => {
  it("flags an act booked more than max times in the window", () => {
    const eventsList = [0, 6, 13].map((offset, i) =>
      evt({
        id: `e${i}`,
        entertainerId: "act-1",
        startsAt: new Date(d("2026-08-01T20:00Z").getTime() + offset * 86_400_000),
        endsAt: new Date(d("2026-08-01T23:00Z").getTime() + offset * 86_400_000),
      })
    );
    const alerts = detectVarietyIssues(eventsList, RULES);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("VARIETY");
    expect(alerts[0].eventIds).toHaveLength(3);
  });

  it("allows the same act outside the window", () => {
    const eventsList = [0, 15].map((offset, i) =>
      evt({
        id: `e${i}`,
        entertainerId: "act-1",
        startsAt: new Date(d("2026-08-01T20:00Z").getTime() + offset * 86_400_000),
        endsAt: new Date(d("2026-08-01T23:00Z").getTime() + offset * 86_400_000),
      })
    );
    expect(detectVarietyIssues(eventsList, RULES)).toHaveLength(0);
  });
});

describe("detectBudgetOverruns", () => {
  const august = [
    evt({ id: "a", startsAt: d("2026-08-01T20:00Z"), endsAt: d("2026-08-01T23:00Z") }),
    evt({ id: "b", startsAt: d("2026-08-08T20:00Z"), endsAt: d("2026-08-08T23:00Z") }),
  ];

  it("flags a month whose committed payouts exceed budget", () => {
    const alerts = detectBudgetOverruns(
      august,
      [
        { eventId: "a", amount: 1200 },
        { eventId: "b", amount: 900 },
      ],
      RULES
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("BUDGET");
    expect(alerts[0].message).toContain("2100");
  });

  it("stays quiet under budget and ignores cancelled events", () => {
    const withCancelled = [...august, evt({ id: "c", startsAt: d("2026-08-15T20:00Z"), endsAt: d("2026-08-15T23:00Z"), status: "cancelled" })];
    const alerts = detectBudgetOverruns(
      withCancelled,
      [
        { eventId: "a", amount: 1200 },
        { eventId: "c", amount: 5000 }, // cancelled — excluded
      ],
      RULES
    );
    expect(alerts).toHaveLength(0);
  });
});

describe("evaluate", () => {
  it("aggregates all alert types", () => {
    const now = d("2026-08-03T12:00Z");
    const conflictPair = [
      evt({ id: "a", startsAt: d("2026-08-07T20:00Z"), endsAt: d("2026-08-07T23:00Z") }),
      evt({ id: "b", startsAt: d("2026-08-07T21:00Z"), endsAt: d("2026-08-08T00:00Z") }),
    ];
    const alerts = evaluate(conflictPair, [{ eventId: "a", amount: 9000 }], { ...RULES, horizonWeeks: 1 }, now);
    const types = alerts.map((a) => a.type);
    expect(types).toContain("CONFLICT");
    expect(types).toContain("BUDGET");
    expect(types).toContain("GAP"); // Saturday 8/8 unbooked (b starts Friday-night UTC)
  });
});
