import { saveBrandKit } from "@/app/actions";
import { getDb } from "@/db";
import { DEFAULT_COLORS } from "@/lib/render/templates";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const db = getDb();
  const venue = await db.query.venues.findFirst();
  const kit = venue
    ? await db.query.brandKits.findFirst({
        where: (bk, { eq }) => eq(bk.venueId, venue.id),
      })
    : null;
  const colors = kit?.colors ?? DEFAULT_COLORS;

  return (
    <section className="panel">
      <h2>Brand kit</h2>
      <p className="muted">These colors, hashtags, and voice shape every generated asset.</p>
      <form action={saveBrandKit} className="form-grid">
        <label>
          Primary (accent)
          <input name="primary" type="color" defaultValue={colors.primary} />
        </label>
        <label>
          Secondary
          <input name="secondary" type="color" defaultValue={colors.secondary} />
        </label>
        <label>
          Background
          <input name="background" type="color" defaultValue={colors.background} />
        </label>
        <label>
          Hashtags (space or comma separated)
          <input name="hashtags" maxLength={300} defaultValue={(kit?.hashtags ?? []).join(" ")} />
        </label>
        <label>
          Voice sample (used for caption tone in v2)
          <textarea name="voiceSample" maxLength={500} defaultValue={kit?.voiceSample ?? ""} />
        </label>
        <button type="submit">Save brand kit</button>
      </form>
    </section>
  );
}
