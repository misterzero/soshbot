/**
 * Demo seed data for "The Rusty Anchor Taproom".
 * Intentionally includes booking problems so the dashboard has alerts to show:
 * - a double-booked Saturday (CONFLICT)
 * - unbooked target Fridays (GAP)
 * - one act booked 3x in two weeks (VARIETY)
 * - payouts that blow the monthly budget (BUDGET)
 */
import { getDb, schema } from "./index";

const db = getDb();

function at(daysFromNow: number, hour: number, durationHrs = 3) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  const end = new Date(d.getTime() + durationHrs * 3_600_000);
  return { startsAt: d, endsAt: end };
}

/** Next occurrence of a weekday (0=Sun..6=Sat), at least `minDays` out. */
function nextDow(dow: number, minDays = 1): number {
  const today = new Date().getDay();
  let delta = (dow - today + 7) % 7;
  if (delta < minDays) delta += 7;
  return delta;
}

async function seed() {
  // idempotent: wipe in FK order
  await db.delete(schema.payouts);
  await db.delete(schema.assets);
  await db.delete(schema.events);
  await db.delete(schema.media);
  await db.delete(schema.calendarSources);
  await db.delete(schema.brandKits);
  await db.delete(schema.entertainers);
  await db.delete(schema.venues);

  await db.insert(schema.venues).values({
    id: "venue-1",
    name: "The Rusty Anchor Taproom",
    timezone: "America/New_York",
    monthlyBudget: 2000,
  });

  await db.insert(schema.brandKits).values({
    id: "brand-1",
    venueId: "venue-1",
    colors: { primary: "#c9a86a", secondary: "#1f3a4d", background: "#12191f" },
    fonts: { heading: "Bebas Neue", body: "Inter" },
    voiceSample:
      "Salty, warm, a little nautical. We pour local drafts and turn the amps up on weekends.",
    hashtags: ["#rustyanchor", "#livemusic", "#supportlocalmusic"],
  });

  await db.insert(schema.calendarSources).values({
    id: "cal-1",
    venueId: "venue-1",
    icalUrl: "https://calendar.google.com/calendar/ical/example/public/basic.ics",
    syncStatus: "never",
  });

  await db.insert(schema.entertainers).values([
    {
      id: "ent-1",
      name: "The Hi-Tones",
      genre: "Surf rock",
      bioShort: "Reverb-drenched surf rock trio.",
      website: "https://hitones.example",
      socials: { instagram: "@thehitones", bandcamp: "hitones" },
      standardRate: 450,
      payoutMethod: "check",
      matchAliases: ["Hi Tones", "Hi-Tones Trio"],
    },
    {
      id: "ent-2",
      name: "Marlene & the Moonshiners",
      genre: "Honky-tonk",
      bioShort: "Classic country with a moonshine kick.",
      socials: { instagram: "@marlenemoonshine" },
      standardRate: 600,
      payoutMethod: "ach",
      matchAliases: ["Moonshiners"],
    },
    {
      id: "ent-3",
      name: "DJ Kelpforest",
      genre: "Electronic",
      bioShort: "Deep-sea beats for late-night tides.",
      socials: { instagram: "@djkelpforest", tiktok: "@djkelpforest" },
      standardRate: 300,
      payoutMethod: "venmo",
      matchAliases: ["Kelpforest", "DJ Kelp"],
    },
  ]);

  const sat = nextDow(6, 2);
  const events = [
    // CONFLICT: two acts, same Saturday night, same stage
    { id: "evt-1", ...at(sat, 20), title: "The Hi-Tones LIVE", entertainerId: "ent-1", space: "main stage" },
    { id: "evt-2", ...at(sat, 21), title: "DJ Kelpforest", entertainerId: "ent-3", space: "main stage" },
    // VARIETY: Hi-Tones again twice more within two weeks
    { id: "evt-3", ...at(sat + 7, 20), title: "Hi Tones return!", entertainerId: "ent-1", space: "main stage" },
    { id: "evt-4", ...at(sat + 13, 20), title: "Surf Saturday: The Hi-Tones", entertainerId: "ent-1", space: "main stage" },
    // A normal booking
    { id: "evt-5", ...at(sat + 14, 19), title: "Marlene & the Moonshiners", entertainerId: "ent-2", space: "main stage" },
    // Unmatched event (review queue demo)
    { id: "evt-6", ...at(sat + 5, 19), title: "Trivia Night", entertainerId: null, space: "taproom" },
  ].map((e, i) => ({
    ...e,
    venueId: "venue-1",
    icalUid: `seed-uid-${i + 1}@soshbot`,
    status: "confirmed" as const,
  }));
  await db.insert(schema.events).values(events);

  // BUDGET: payouts total $2,250 against a $2,000 budget (if in same month)
  await db.insert(schema.payouts).values([
    { id: "pay-1", eventId: "evt-1", amount: 450, status: "pending" },
    { id: "pay-2", eventId: "evt-2", amount: 300, status: "pending" },
    { id: "pay-3", eventId: "evt-3", amount: 450, status: "pending" },
    { id: "pay-4", eventId: "evt-4", amount: 450, status: "pending" },
    { id: "pay-5", eventId: "evt-5", amount: 600, status: "pending" },
  ]);

  console.log(`Seeded ${events.length} events for The Rusty Anchor Taproom.`);
}

seed().then(() => process.exit(0));
