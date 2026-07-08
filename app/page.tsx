import { getDb, schema } from "@/db";
import { evaluate, DEFAULT_RULES, type RuleEvent } from "@/lib/rules/engine";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function Dashboard() {
  const db = getDb();

  const venue = await db.query.venues.findFirst();
  if (!venue) {
    return (
      <div className="panel">
        <h2>No data yet</h2>
        <p className="empty">Run `npm run db:reset` to load the demo seed.</p>
      </div>
    );
  }

  const allEvents = await db.select().from(schema.events);
  const allPayouts = await db.select().from(schema.payouts);
  const roster = await db.select().from(schema.entertainers);
  const actName = new Map(roster.map((e) => [e.id, e.name]));

  const ruleEvents: RuleEvent[] = allEvents.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    space: e.space,
    entertainerId: e.entertainerId,
    status: e.status,
  }));

  const alerts = evaluate(
    ruleEvents,
    allPayouts.map((p) => ({ eventId: p.eventId, amount: p.amount })),
    { ...DEFAULT_RULES, monthlyBudget: venue.monthlyBudget }
  );

  const upcoming = allEvents
    .filter((e) => e.status !== "cancelled" && e.startsAt.getTime() > Date.now())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const committed = allPayouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <section className="panel">
        <h2>Booking alerts</h2>
        {alerts.length === 0 ? (
          <p className="empty">All clear — no conflicts, gaps, or budget issues.</p>
        ) : (
          alerts.map((a, i) => (
            <div className="alert" data-type={a.type} key={i}>
              <span className="tag">{a.type}</span>
              <span>{a.message}</span>
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2>Upcoming events</h2>
        {upcoming.length === 0 ? (
          <p className="empty">Nothing booked. Connect a calendar feed to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>Act</th>
                <th>Space</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((e) => (
                <tr key={e.id}>
                  <td>{fmt(e.startsAt)}</td>
                  <td>{e.title}</td>
                  <td>
                    {e.entertainerId ? (
                      actName.get(e.entertainerId)
                    ) : (
                      <span className="pill">unmatched</span>
                    )}
                  </td>
                  <td className="muted">{e.space ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2>Entertainers</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Genre</th>
              <th>Rate</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td className="muted">{e.genre}</td>
                <td>{e.standardRate ? `$${e.standardRate}` : "—"}</td>
                <td className="muted">{e.payoutMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginBottom: 0 }}>
          Committed payouts: ${committed.toFixed(0)} / ${venue.monthlyBudget.toFixed(0)} monthly budget
        </p>
      </section>
    </>
  );
}
