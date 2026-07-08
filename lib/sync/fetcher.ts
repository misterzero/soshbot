/**
 * Hardened iCal feed fetcher.
 * Controls: https-only + private-host rejection (isAllowedFeedUrl), no
 * redirects (a redirect could bounce to an internal address), response size
 * cap, timeout, and content-type sanity check.
 */
import { isAllowedFeedUrl } from "./ical";

const MAX_BYTES = 1_000_000; // 1 MB is generous for an ics feed
const TIMEOUT_MS = 10_000;

export class FeedFetchError extends Error {}

export async function fetchIcsFeed(url: string): Promise<string> {
  if (!isAllowedFeedUrl(url)) {
    throw new FeedFetchError("Feed URL not allowed (must be public https)");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "error",
      signal: controller.signal,
      headers: { accept: "text/calendar, text/plain;q=0.9, */*;q=0.1" },
    });
  } catch (err) {
    throw new FeedFetchError(
      err instanceof Error && err.name === "AbortError" ? "Feed fetch timed out" : "Feed fetch failed"
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new FeedFetchError(`Feed returned HTTP ${res.status}`);

  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BYTES) {
    throw new FeedFetchError("Feed too large");
  }

  const text = await res.text();
  if (text.length > MAX_BYTES) throw new FeedFetchError("Feed too large");
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new FeedFetchError("Response is not an iCalendar feed");
  }
  return text;
}
