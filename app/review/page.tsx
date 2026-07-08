import { isNull, and, ne, gt } from "drizzle-orm";
import { assignEventToEntertainer } from "@/app/actions";
import { getDb, schema } from "@/db";

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

export default async function ReviewPage() {
  const db = getDb();
  const unmatched = await db
    .select()
    .from(schema.events)
    .where(
      and(
        isNull(schema.events.entertainerId),
        ne(schema.events.status, "cancelled"),
        gt(schema.events.startsAt, new Date())
      )
    );
  const roster = await db.select().from(schema.entertainers);

  return (
    <section className="panel">
      <h2>Review queue</h2>
      <p className="muted">
        Events from your calendar that could not be confidently matched to an entertainer.
        Assigning one also teaches the matcher for future syncs.
      </p>
      {unmatched.length === 0 ? (
        <p className="empty">Nothing to review.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Title</th>
              <th>Assign to</th>
            </tr>
          </thead>
          <tbody>
            {unmatched.map((e) => (
              <tr key={e.id}>
                <td>{fmt(e.startsAt)}</td>
                <td>{e.title}</td>
                <td>
                  <form action={assignEventToEntertainer} className="inline-form">
                    <input type="hidden" name="eventId" value={e.id} />
                    <select name="entertainerId" required defaultValue="">
                      <option value="" disabled>
                        Choose act…
                      </option>
                      {roster.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit">Assign</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
