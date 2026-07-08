/**
 * Caption grammar (F3): assembles platform-ready captions from event facts,
 * entertainer socials, and the venue brand kit. Deterministic templates in v1;
 * the render pipeline (Satori) consumes the same inputs in M3.
 */

export type CaptionEvent = {
  title: string;
  startsAt: Date;
  space?: string | null;
};

export type CaptionEntertainer = {
  name: string;
  bioShort?: string | null;
  socials?: Record<string, string> | null;
};

export type CaptionBrand = {
  venueName: string;
  hashtags?: string[] | null;
};

function formatWhen(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(d);
}

function handleLine(socials?: Record<string, string> | null): string | null {
  if (!socials) return null;
  const handles = Object.values(socials).filter((h) => h.startsWith("@"));
  return handles.length ? `Follow ${handles.join(" ")}` : null;
}

export function buildDailyCaption(
  event: CaptionEvent,
  entertainer: CaptionEntertainer | null,
  brand: CaptionBrand,
  timezone = "America/New_York"
): string {
  const when = formatWhen(event.startsAt, timezone);
  const lines: string[] = [];

  if (entertainer) {
    lines.push(`${entertainer.name} takes the ${event.space ?? "stage"} at ${brand.venueName}!`);
    if (entertainer.bioShort) lines.push(entertainer.bioShort);
  } else {
    lines.push(`${event.title} at ${brand.venueName}!`);
  }
  lines.push(when);

  const handles = handleLine(entertainer?.socials);
  if (handles) lines.push(handles);
  if (brand.hashtags?.length) lines.push(brand.hashtags.join(" "));

  return lines.join("\n");
}

export function buildWeeklyCaption(
  weekEvents: { event: CaptionEvent; entertainer: CaptionEntertainer | null }[],
  brand: CaptionBrand,
  timezone = "America/New_York"
): string {
  const lines: string[] = [`This week at ${brand.venueName}:`];
  for (const { event, entertainer } of weekEvents) {
    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone,
    }).format(event.startsAt);
    lines.push(`${day} — ${entertainer?.name ?? event.title}`);
  }
  if (brand.hashtags?.length) lines.push(brand.hashtags.join(" "));
  return lines.join("\n");
}
