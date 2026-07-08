import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { toCsv } from "@/lib/csv/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const events = await db.select().from(schema.events);
  const payouts = await db.select().from(schema.payouts);
  const roster = await db.select().from(schema.entertainers);
  const actName = new Map(roster.map((e) => [e.id, e.name]));
  const eventById = new Map(events.map((e) => [e.id, e]));

  const rows = payouts
    .map((p) => {
      const e = eventById.get(p.eventId);
      if (!e) return null;
      return [
        e.startsAt.toISOString().slice(0, 10),
        e.title,
        e.entertainerId ? (actName.get(e.entertainerId) ?? "") : "",
        p.amount,
        p.status,
        p.paidAt ? p.paidAt.toISOString().slice(0, 10) : "",
        e.status,
      ];
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const csv = toCsv(
    ["date", "event", "entertainer", "amount", "status", "paid_on", "event_status"],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="soshbot-payouts.csv"',
      "x-content-type-options": "nosniff",
    },
  });
}
