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
import { generateAsset } from "@/lib/render/generate";
import type { AssetType, Platform } from "@/lib/render/pipeline";
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

const payoutSchema = z.object({
  eventId: z.string().min(1),
  amount: z.coerce.number().nonnegative().max(1_000_000),
  status: z.enum(["pending", "paid"]),
});

export async function savePayout(formData: FormData): Promise<void> {
  const parsed = payoutSchema.safeParse({
    eventId: str(formData, "eventId"),
    amount: str(formData, "amount"),
    status: str(formData, "status"),
  });
  if (!parsed.success) throw new Error("Invalid payout data");
  const { eventId, amount, status } = parsed.data;

  const db = getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event) throw new Error("Event not found");

  const existing = await db.query.payouts.findFirst({
    where: eq(schema.payouts.eventId, eventId),
  });
  const values = {
    amount,
    status,
    paidAt: status === "paid" ? new Date() : null,
  };
  if (existing) {
    await db.update(schema.payouts).set(values).where(eq(schema.payouts.id, existing.id));
  } else {
    await db.insert(schema.payouts).values({ id: randomUUID(), eventId, ...values });
  }
  revalidatePath("/payouts");
  revalidatePath("/");
}

export async function setMonthlyBudget(formData: FormData): Promise<void> {
  const amount = z.coerce.number().nonnegative().max(10_000_000).safeParse(str(formData, "monthlyBudget"));
  if (!amount.success) throw new Error("Invalid budget");
  const db = getDb();
  const venue = await db.query.venues.findFirst();
  if (!venue) throw new Error("No venue configured");
  await db.update(schema.venues).set({ monthlyBudget: amount.data }).where(eq(schema.venues.id, venue.id));
  revalidatePath("/payouts");
  revalidatePath("/");
}

const generateSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly"]),
  platform: z.enum(["ig_square", "ig_story", "fb_landscape"]),
  eventId: z.string().uuid().or(z.string().regex(/^evt-[\w-]+$/)).optional(),
});

export async function generatePromoAssets(formData: FormData): Promise<void> {
  const parsed = generateSchema.safeParse({
    type: str(formData, "type"),
    platform: str(formData, "platform"),
    eventId: str(formData, "eventId"),
  });
  if (!parsed.success) throw new Error("Invalid generation request");
  const { type, platform, eventId } = parsed.data;
  const result = await generateAsset(type as AssetType, platform as Platform, eventId);
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/assets");
}

const brandSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  voiceSample: z.string().max(500).optional(),
  hashtags: z.string().max(300).optional(),
});

export async function saveBrandKit(formData: FormData): Promise<void> {
  const parsed = brandSchema.safeParse({
    primary: str(formData, "primary"),
    secondary: str(formData, "secondary"),
    background: str(formData, "background"),
    voiceSample: str(formData, "voiceSample"),
    hashtags: str(formData, "hashtags"),
  });
  if (!parsed.success) throw new Error("Invalid brand kit data");

  const db = getDb();
  const venue = await db.query.venues.findFirst();
  if (!venue) throw new Error("No venue configured");
  const d = parsed.data;
  const values = {
    colors: { primary: d.primary, secondary: d.secondary, background: d.background },
    voiceSample: d.voiceSample ?? null,
    hashtags: d.hashtags
      ? d.hashtags.split(/[\s,]+/).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`))
      : null,
  };

  const existing = await db.query.brandKits.findFirst({
    where: eq(schema.brandKits.venueId, venue.id),
  });
  if (existing) {
    await db.update(schema.brandKits).set(values).where(eq(schema.brandKits.id, existing.id));
  } else {
    await db.insert(schema.brandKits).values({ id: randomUUID(), venueId: venue.id, ...values });
  }
  revalidatePath("/brand");
  revalidatePath("/assets");
}
