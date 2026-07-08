import { addCalendarSource, removeCalendarSource, runSync } from "@/app/actions";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const db = getDb();
  const sources = await db.select().from(schema.calendarSources);

  return (
    <section className="panel">
      <h2>Calendar feeds</h2>
      <p className="muted">
        Subscribe to public iCal feeds (Google Calendar, Apple, Outlook). soshbot pulls events
        hourly in production; use Sync now to pull immediately.
      </p>

      {sources.length === 0 ? (
        <p className="empty">No feeds yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Feed URL</th>
              <th>Status</th>
              <th>Last synced</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td style={{ wordBreak: "break-all" }}>{s.icalUrl}</td>
                <td>
                  <span className="pill">{s.syncStatus}</span>
                </td>
                <td className="muted">
                  {s.lastSyncedAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(s.lastSyncedAt) : "never"}
                </td>
                <td>
                  <form action={removeCalendarSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="danger">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form action={addCalendarSource} className="inline-form" style={{ marginTop: "1rem" }}>
        <input name="icalUrl" type="url" required placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" style={{ flex: 1 }} />
        <button type="submit">Add feed</button>
      </form>

      <form action={runSync} style={{ marginTop: "1rem" }}>
        <button type="submit">Sync now</button>
      </form>
    </section>
  );
}
