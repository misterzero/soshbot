import { and, gt, ne } from "drizzle-orm";
import { generatePromoAssets } from "@/app/actions";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

const PLATFORM_LABELS: Record<string, string> = {
  ig_square: "Instagram post (1080×1080)",
  ig_story: "Instagram story (1080×1920)",
  fb_landscape: "Facebook (1200×630)",
};

export default async function AssetsPage() {
  const db = getDb();
  const generated = (await db.select().from(schema.assets)).sort(
    (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
  );
  const upcoming = (
    await db
      .select()
      .from(schema.events)
      .where(and(ne(schema.events.status, "cancelled"), gt(schema.events.startsAt, new Date())))
  ).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <>
      <section className="panel">
        <h2>Generate promo assets</h2>
        <form action={generatePromoAssets} className="inline-form" style={{ flexWrap: "wrap" }}>
          <select name="type" defaultValue="daily">
            <option value="daily">Daily event post</option>
            <option value="weekly">Weekly lineup</option>
            <option value="monthly">Monthly calendar</option>
          </select>
          <select name="platform" defaultValue="ig_square">
            {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select name="eventId" defaultValue="">
            <option value="">Next upcoming event (daily only)</option>
            {upcoming.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} — {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(e.startsAt)}
              </option>
            ))}
          </select>
          <button type="submit">Generate</button>
        </form>
      </section>

      <section className="panel">
        <h2>Review gallery</h2>
        {generated.length === 0 ? (
          <p className="empty">Nothing generated yet.</p>
        ) : (
          <div className="asset-grid">
            {generated.map((a) => (
              <figure key={a.id} className="asset-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/assets/${a.id}`} alt={`${a.type} asset`} />
                <figcaption>
                  <span className="pill">{a.type}</span>{" "}
                  <span className="pill">{PLATFORM_LABELS[a.platform] ?? a.platform}</span>
                  <textarea readOnly rows={4} defaultValue={a.caption ?? ""} />
                  <a href={`/api/assets/${a.id}`} download>
                    Download PNG
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
