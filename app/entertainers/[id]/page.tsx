import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { uploadMedia } from "@/app/actions";
import { getDb, schema } from "@/db";
import { EntertainerForm } from "../EntertainerForm";

export const dynamic = "force-dynamic";

export default async function EntertainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const entertainer = await db.query.entertainers.findFirst({
    where: eq(schema.entertainers.id, id),
  });
  if (!entertainer) notFound();

  const items = await db.select().from(schema.media).where(eq(schema.media.entertainerId, id));

  return (
    <>
      <section className="panel">
        <h2>Edit: {entertainer.name}</h2>
        <EntertainerForm entertainer={entertainer} />
      </section>

      <section className="panel">
        <h2>Media</h2>
        {items.length === 0 ? (
          <p className="empty">No images yet.</p>
        ) : (
          <div className="media-grid">
            {items.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.id} src={`/api/media/${m.id}`} alt={`${entertainer.name} ${m.kind}`} />
            ))}
          </div>
        )}
        <form action={uploadMedia} className="form-grid">
          <input type="hidden" name="entertainerId" value={entertainer.id} />
          <label>
            Image (png, jpg, webp — max 5MB)
            <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
          </label>
          <label>
            Kind
            <select name="kind" defaultValue="promo">
              <option value="promo">Promo photo</option>
              <option value="logo">Logo</option>
            </select>
          </label>
          <button type="submit">Upload</button>
        </form>
      </section>
    </>
  );
}
