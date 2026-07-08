/**
 * iCal ingest (F1): parse .ics text into candidate events keyed on UID.
 * Pure parsing — fetching (with SSRF guards) and upserting live in the
 * sync handler. Recurrence expansion lands in M1.
 */
import ical from "node-ical";

export type CandidateEvent = {
  icalUid: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
};

export function parseEventsFromIcs(icsText: string): CandidateEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  const out: CandidateEvent[] = [];
  for (const item of Object.values(parsed)) {
    if (item.type !== "VEVENT") continue;
    if (!item.uid || !item.start) continue;
    const startsAt = new Date(item.start);
    // node-ical defaults a missing DTEND to DTSTART (zero duration);
    // treat that the same as absent and assume a 2h set.
    let endsAt = item.end ? new Date(item.end) : startsAt;
    if (endsAt.getTime() <= startsAt.getTime()) {
      endsAt = new Date(startsAt.getTime() + 2 * 3_600_000);
    }
    out.push({
      icalUid: String(item.uid),
      title: item.summary ? String(item.summary) : "(untitled)",
      startsAt,
      endsAt,
      location: item.location ? String(item.location) : undefined,
    });
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * SSRF guard for user-supplied feed URLs: https only, no credentials,
 * and reject obvious private/link-local hosts. DNS-resolution pinning
 * is enforced at fetch time in the sync handler (M1).
 */
export function isAllowedFeedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  // IPv4 literal private ranges
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
  }
  // IPv6 literals: reject outright in v1 (feeds are hostname-based in practice)
  if (host.includes(":")) return false;
  return true;
}
