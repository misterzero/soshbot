import Link from "next/link";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function EntertainersPage() {
  const db = getDb();
  const roster = await db.select().from(schema.entertainers);
  const allMedia = await db.select().from(schema.media);
  const mediaCount = new Map<string, number>();
  for (const m of allMedia) {
    mediaCount.set(m.entertainerId, (mediaCount.get(m.entertainerId) ?? 0) + 1);
  }

  return (
    <section className="panel">
      <h2>Entertainers</h2>
      <p>
        <Link href="/entertainers/new">+ Add entertainer</Link>
      </p>
      {roster.length === 0 ? (
        <p className="empty">No entertainers yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Genre</th>
              <th>Rate</th>
              <th>Media</th>
              <th>Aliases</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/entertainers/${e.id}`}>{e.name}</Link>
                </td>
                <td className="muted">{e.genre ?? "—"}</td>
                <td>{e.standardRate ? `$${e.standardRate}` : "—"}</td>
                <td className="muted">{mediaCount.get(e.id) ?? 0}</td>
                <td className="muted">{(e.matchAliases ?? []).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
