/**
 * Booking rules engine (F4).
 * Pure function: (events, payouts, rules, now) -> Alert[]
 * No I/O, no side effects — trivially unit-testable.
 */

export type RuleEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  space?: string | null;
  entertainerId?: string | null;
  status: "draft" | "confirmed" | "cancelled";
};

export type RulePayout = {
  eventId: string;
  amount: number;
};

export type BookingRules = {
  /** Weekdays the venue wants booked (0=Sun..6=Sat), e.g. [5, 6] for Fri/Sat. */
  targetDays: number[];
  /** How far ahead to look for gaps, in weeks. */
  horizonWeeks: number;
  /** Max times the same act may appear within the variety window. */
  varietyMaxRepeats: number;
  varietyWindowDays: number;
  monthlyBudget: number;
};

export type Alert = {
  type: "CONFLICT" | "GAP" | "VARIETY" | "BUDGET";
  message: string;
  eventIds: string[];
};

const DAY_MS = 86_400_000;

function overlaps(a: RuleEvent, b: RuleEvent): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

function sameSpace(a: RuleEvent, b: RuleEvent): boolean {
  // Unknown spaces are treated as the same space: safer to over-warn.
  if (a.space == null || b.space == null) return true;
  return a.space.trim().toLowerCase() === b.space.trim().toLowerCase();
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function detectConflicts(events: RuleEvent[]): Alert[] {
  const live = events.filter((e) => e.status !== "cancelled");
  const alerts: Alert[] = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      if (overlaps(a, b) && sameSpace(a, b)) {
        alerts.push({
          type: "CONFLICT",
          message: `"${a.title}" and "${b.title}" overlap on ${ymd(a.startsAt)}${
            a.space ? ` (${a.space})` : ""
          }`,
          eventIds: [a.id, b.id],
        });
      }
    }
  }
  return alerts;
}

export function detectGaps(events: RuleEvent[], rules: BookingRules, now: Date): Alert[] {
  const live = events.filter((e) => e.status !== "cancelled");
  const alerts: Alert[] = [];
  const horizonDays = rules.horizonWeeks * 7;
  for (let d = 1; d <= horizonDays; d++) {
    const day = new Date(now.getTime() + d * DAY_MS);
    if (!rules.targetDays.includes(day.getDay())) continue;
    const dayStr = ymd(day);
    const booked = live.some((e) => ymd(e.startsAt) === dayStr);
    if (!booked) {
      alerts.push({
        type: "GAP",
        message: `No event booked for ${day.toLocaleDateString("en-US", {
          weekday: "long",
        })} ${dayStr}`,
        eventIds: [],
      });
    }
  }
  return alerts;
}

export function detectVarietyIssues(events: RuleEvent[], rules: BookingRules): Alert[] {
  const live = events.filter((e) => e.status !== "cancelled" && e.entertainerId);
  const byAct = new Map<string, RuleEvent[]>();
  for (const e of live) {
    const list = byAct.get(e.entertainerId!) ?? [];
    list.push(e);
    byAct.set(e.entertainerId!, list);
  }
  const alerts: Alert[] = [];
  const windowMs = rules.varietyWindowDays * DAY_MS;
  for (const [actId, actEvents] of byAct) {
    const sorted = [...actEvents].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    for (let i = 0; i < sorted.length; i++) {
      const windowEnd = sorted[i].startsAt.getTime() + windowMs;
      const inWindow = sorted.filter(
        (e) => e.startsAt.getTime() >= sorted[i].startsAt.getTime() && e.startsAt.getTime() <= windowEnd
      );
      if (inWindow.length > rules.varietyMaxRepeats) {
        alerts.push({
          type: "VARIETY",
          message: `Act booked ${inWindow.length} times within ${rules.varietyWindowDays} days (max ${rules.varietyMaxRepeats}) — entertainer ${actId}`,
          eventIds: inWindow.map((e) => e.id),
        });
        break; // one alert per act
      }
    }
  }
  return alerts;
}

export function detectBudgetOverruns(
  events: RuleEvent[],
  payouts: RulePayout[],
  rules: BookingRules
): Alert[] {
  if (rules.monthlyBudget <= 0) return [];
  const eventById = new Map(events.map((e) => [e.id, e]));
  const committedByMonth = new Map<string, { total: number; eventIds: string[] }>();
  for (const p of payouts) {
    const event = eventById.get(p.eventId);
    if (!event || event.status === "cancelled") continue;
    const key = monthKey(event.startsAt);
    const entry = committedByMonth.get(key) ?? { total: 0, eventIds: [] };
    entry.total += p.amount;
    entry.eventIds.push(p.eventId);
    committedByMonth.set(key, entry);
  }
  const alerts: Alert[] = [];
  for (const [month, { total, eventIds }] of committedByMonth) {
    if (total > rules.monthlyBudget) {
      alerts.push({
        type: "BUDGET",
        message: `Committed payouts for ${month} total $${total.toFixed(0)}, exceeding the $${rules.monthlyBudget.toFixed(0)} budget`,
        eventIds,
      });
    }
  }
  return alerts;
}

export function evaluate(
  events: RuleEvent[],
  payouts: RulePayout[],
  rules: BookingRules,
  now: Date = new Date()
): Alert[] {
  return [
    ...detectConflicts(events),
    ...detectGaps(events, rules, now),
    ...detectVarietyIssues(events, rules),
    ...detectBudgetOverruns(events, payouts, rules),
  ];
}

export const DEFAULT_RULES: BookingRules = {
  targetDays: [5, 6],
  horizonWeeks: 4,
  varietyMaxRepeats: 2,
  varietyWindowDays: 14,
  monthlyBudget: 0,
};
