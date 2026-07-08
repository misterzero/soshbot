import { describe, expect, it } from "vitest";
import { isAllowedFeedUrl, parseEventsFromIcs } from "./ical";

const FIXTURE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:uid-1@example.com
SUMMARY:The Hi-Tones LIVE
DTSTART:20260801T200000Z
DTEND:20260801T230000Z
LOCATION:Main Stage
END:VEVENT
BEGIN:VEVENT
UID:uid-2@example.com
SUMMARY:Trivia Night
DTSTART:20260805T190000Z
END:VEVENT
END:VCALENDAR
`;

describe("parseEventsFromIcs", () => {
  it("parses VEVENTs sorted by start", () => {
    const events = parseEventsFromIcs(FIXTURE);
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe("The Hi-Tones LIVE");
    expect(events[0].icalUid).toBe("uid-1@example.com");
    expect(events[0].location).toBe("Main Stage");
    expect(events[0].startsAt.toISOString()).toBe("2026-08-01T20:00:00.000Z");
    expect(events[0].endsAt.toISOString()).toBe("2026-08-01T23:00:00.000Z");
  });

  it("defaults a missing DTEND to start + 2h", () => {
    const trivia = parseEventsFromIcs(FIXTURE)[1];
    expect(trivia.endsAt.getTime() - trivia.startsAt.getTime()).toBe(2 * 3_600_000);
  });

  it("returns empty for non-calendar text", () => {
    expect(parseEventsFromIcs("not an ics file")).toEqual([]);
  });
});

describe("isAllowedFeedUrl (SSRF guard)", () => {
  it("allows public https URLs", () => {
    expect(isAllowedFeedUrl("https://calendar.google.com/calendar/ical/x/public/basic.ics")).toBe(true);
  });

  it("rejects http, credentials, and private hosts", () => {
    expect(isAllowedFeedUrl("http://calendar.google.com/basic.ics")).toBe(false);
    expect(isAllowedFeedUrl("https://user:pass@example.com/cal.ics")).toBe(false);
    expect(isAllowedFeedUrl("https://localhost/cal.ics")).toBe(false);
    expect(isAllowedFeedUrl("https://10.0.0.5/cal.ics")).toBe(false);
    expect(isAllowedFeedUrl("https://172.20.1.1/cal.ics")).toBe(false);
    expect(isAllowedFeedUrl("https://192.168.1.10/cal.ics")).toBe(false);
    expect(isAllowedFeedUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedFeedUrl("https://metadata.internal/cal.ics")).toBe(false);
    expect(isAllowedFeedUrl("not a url")).toBe(false);
  });
});
