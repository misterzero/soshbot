"use server";

/**
 * Server actions: all mutations flow through here, Zod-validated.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { detectImageType, MAX_UPLOAD_BYTES } from "@/lib/media/sniff";
import { syncAllSources } from "@/lib/sync/apply";
import { isAllowedFeedUrl } from "@/lib/sync/ical";

const MEDIA_DIR = ".data/media";

function str(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
}

const entertainerSchema = z.object({
  name: z.string().min(1).max(120),
  genre: z.string().max(80).optional(),
  bioShort: z.string().max(280).optional(),
  website: z.string().url().max(300).optional(),
  instagram: z.string().max(80).optional(),
  standardRate: z.coerce.number().nonnegative().max(1_000_000).optional(),
  payoutMethod: z.string().max(40).optional(),
  aliases: z.string().max(500).optional(),
});

export async function saveEntertainer(formData: FormData): Promise<void> {
  const parsed = entertainerSchema.safeParse({
    name: str(formData, "name"),
    genre: str(formData, "genre"),
    bioShort: str(formData, "bioShort"),
    website: str(formData, "website"),
    instagram: str(formData, "instagram"),
    standardRate: str(formData, "standardRate"),
    payoutMethod: str(formData, "payoutMethod"),
    aliases: str(formData, "aliases"),
  });
  if (!parsed.success) throw new Error("Invalid entertainer data");

  const db = getDb();
  const id = str(formData, "id");
  const d = parsed.data;
  const values = {
    name: d.name,
    genre: d.genre ?? null,
    bioShort: d.bioShort ?? null,
    website: d.website ?? null,
    socials: d.instagram ? { instagram: d.instagram } : null,
    standardRate: d.standardRate ?? null,
    payoutMethod: d.payoutMethod ?? null,
    matchAliases: d.aliases
      ? d.aliases.split(",").map((a) => a.trim()).filter(Boolean)
      : null,
  };

  if (id) {
    await db.update(schema.entertainers).set(values).where(eq(schema.entertainers.id, id));
  } else {
    await db.insert(schema.entertainers).values({ id: randomUUID(), ...values });
  }
  revalidatePath("/entertainers");
  redirect("/entertainers");
}

export async function uploadMedia(formData: FormData): Promise<void> {
  const entertainerId = str(formData, "entertainerId");
  const kind = str(formData, "kind") === "logo" ? "logo" : "promo";
  const file = formData.get("file");
  if (!entertainerId || !(file instanceof File)) throw new Error("Missing upload");
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("File too large or empty");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = detectImageType(bytes);
  if (!sniffed) throw new Error("Unsupported image type (png, jpg, webp only)");

  const db = getDb();
  const id = randomUUID();
  const filename = `${id}.${sniffed.ext}`; // random server-side name; client name discarded
  mkdirSync(MEDIA_DIR, { recursive: true });
  await writeFile(`${MEDIA_DIR}/${filename}`, bytes);

  await db.insert(schema.media).values({
    id,
    entertainerId,
    kind,
    path: filename,
    mime: sniffed.mime,
    isDefault: false,
  });
  revalidatePath(`/entertainers/${entertainerId}`);
}

export async function assignEventToEntertainer(formData: FormData): Promise<void> {
  const eventId = str(formData, "eventId");
  const entertainerId = str(formData, "entertainerId");
  if (!eventId || !entertainerId) throw new Error("Missing assignment");

  const db = getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  const entertainer = await db.query.entertainers.findFirst({
    where: eq(schema.entertainers.id, entertainerId),
  });
  if (!event || !entertainer) throw new Error("Not found");

  await db
    .update(schema.events)
    .set({ entertainerId })
    .where(eq(schema.events.id, eventId));

  // Teach the matcher: remember this title as an alias for next sync.
  const aliases = new Set(entertainer.matchAliases ?? []);
  if (!aliases.has(event.title)) {
    aliases.add(event.title);
    await db
      .update(schema.entertainers)
      .set({ matchAliases: [...aliases] })
      .where(eq(schema.entertainers.id, entertainerId));
  }
  revalidatePath("/review");
  revalidatePath("/");
}

export async function addCalendarSource(formData: FormData): Promise<void> {
  const icalUrl = str(formData, "icalUrl");
  if (!icalUrl || !isAllowedFeedUrl(icalUrl)) {
    throw new Error("Feed URL must be public https");
  }
  const db = getDb();
  const venue = await db.query.venues.findFirst();
  if (!venue) throw new Error("No venue configured");
  await db.insert(schema.calendarSources).values({
    id: randomUUID(),
    venueId: venue.id,
    icalUrl,
    syncStatus: "never",
  });
  revalidatePath("/sources");
}

export async function removeCalendarSource(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) return;
  const db = getDb();
  await db.delete(schema.calendarSources).where(eq(schema.calendarSources.id, id));
  revalidatePath("/sources");
}

export async function runSync(): Promise<void> {
  await syncAllSources();
  revalidatePath("/");
  revalidatePath("/sources");
  revalidatePath("/review");
}
