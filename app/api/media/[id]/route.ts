import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Lookup by DB id only — the stored filename is server-generated, and we
  // never join user input into a filesystem path.
  const db = getDb();
  const item = await db.query.media.findFirst({ where: eq(schema.media.id, id) });
  if (!item) return new NextResponse("Not found", { status: 404 });

  try {
    const buf = await readFile(`.data/media/${item.path}`);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": item.mime,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
