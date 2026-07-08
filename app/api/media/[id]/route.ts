import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Lookup by DB id only — the stored key is server-generated, and we never
  // join user input into a storage key.
  const db = getDb();
  const item = await db.query.media.findFirst({ where: eq(schema.media.id, id) });
  if (!item) return new NextResponse("Not found", { status: 404 });

  const bytes = await getObject(`media/${item.path}`);
  if (!bytes) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": item.mime,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
