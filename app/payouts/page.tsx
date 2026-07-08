import { savePayout, setMonthlyBudget } from "@/app/actions";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PayoutsPage() {
  const db = getDb();
  const venue = await db.query.venues.findFirst();
  if (!venue) return <section className="panel"><p className="empty">Run the seed first.</p></section>;

  const events = (await db.select().from(schema.events)).sort(
    (a, b) => b.startsAt.getTime() - a.startsAt.getTime()
  );
  const payouts = await db.select().from(schema.payouts);
  const roster = await db.select().from(schema.entertainers);
  const actName = new Map(roster.map((e) => [e.id, e.name]));
  const rateByAct = new Map(roster.map((e) => [e.id, e.standardRate]));
  const payoutByEvent = new Map(payouts.map((p) => [p.eventId, p]));

  // This month's committed / paid, from non-cancelled events
  const nowKey = monthKey(new Date());
  let committed = 0;
  let paid = 0;
  for (const p of payouts) {
    const event = events.find((e) => e.id === p.eventId);
    if (!event || event.status === "cancelled") continue;
    if (monthKey(event.startsAt) !== nowKey) continue;
    committed += p.amount;
    if (p.status === "paid") paid += p.amount;
  }
  const pct = venue.monthlyBudget > 0 ? Math.min(100, (committed / venue.monthlyBudget) * 100) : 0;
  const over = venue.monthlyBudget > 0 && committed > venue.monthlyBudget;

  // Per-entertainer totals (all time, non-cancelled)
  const byAct = new Map<string, { total: number; count: number }>();
  for (const p of payouts) {
    const event = events.find((e) => e.id === p.eventId);
    if (!event || event.status === "cancelled" || !event.entertainerId) continue;
    const entry = byAct.get(event.entertainerId) ?? { total: 0, count: 0 };
    entry.total += p.amount;
    entry.count += 1;
    byAct.set(event.entertainerId, entry);
  }

  return (
    <>
      <section className="panel">
        <h2>This month</h2>
        <div className="budget-bar">
          <div
            className="budget-fill"
            style={{ width: `${pct}%`, backgroundColor: over ? "var(--danger)" : "var(--brand)" }}
          />
        </div>
        <p className="muted">
          ${committed.toFixed(0)} committed (${paid.toFixed(0)} paid) of ${venue.monthlyBudget.toFixed(0)} budget
          {over && <strong style={{ color: "var(--danger)" }}> — over budget</strong>}
        </p>
        <form action={setMonthlyBudget} className="inline-form">
          <label className="muted">Monthly budget $</label>
          <input name="monthlyBudget" type="number" min="0" step="50" defaultValue={venue.monthlyBudget} />
          <button type="submit">Update</button>
        </form>
      </section>

      <section className="panel">
        <h2>Event payouts</h2>
        <p>
          <a href="/api/payouts.csv" download>Export CSV</a>
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Act</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events
              .filter((e) => e.status !== "cancelled")
              .slice(0, 50)
              .map((e) => {
                const p = payoutByEvent.get(e.id);
                const suggested = e.entertainerId ? rateByAct.get(e.entertainerId) : null;
                return (
                  <tr key={e.id}>
                    <td>{fmt(e.startsAt)}</td>
                    <td>{e.title}</td>
                    <td className="muted">{e.entertainerId ? actName.get(e.entertainerId) : "—"}</td>
                    <td colSpan={3}>
                      <form action={savePayout} className="inline-form">
                        <input type="hidden" name="eventId" value={e.id} />
                        <input
                          name="amount"
                          type="number"
                          min="0"
                          step="25"
                          defaultValue={p?.amount ?? suggested ?? ""}
                          placeholder={suggested ? `${suggested} (standard)` : "0"}
                          style={{ width: "7rem" }}
                        />
                        <select name="status" defaultValue={p?.status ?? "pending"}>
                          <option value="pending">pending</option>
                          <option value="paid">paid</option>
                        </select>
                        <button type="submit">Save</button>
                        {p?.paidAt && <span className="muted">paid {fmt(p.paidAt)}</span>}
                      </form>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Spend by entertainer</h2>
        {byAct.size === 0 ? (
          <p className="empty">No payouts recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Act</th>
                <th>Bookings</th>
                <th>Total</th>
                <th>Avg / booking</th>
              </tr>
            </thead>
            <tbody>
              {[...byAct.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([actId, { total, count }]) => (
                  <tr key={actId}>
                    <td>{actName.get(actId) ?? actId}</td>
                    <td className="muted">{count}</td>
                    <td>${total.toFixed(0)}</td>
                    <td className="muted">${(total / count).toFixed(0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
