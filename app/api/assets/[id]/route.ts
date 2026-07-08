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
  const db = getDb();
  const asset = await db.query.assets.findFirst({ where: eq(schema.assets.id, id) });
  if (!asset) return new NextResponse("Not found", { status: 404 });

  try {
    const buf = await readFile(`.data/assets/${asset.imagePath}`);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `inline; filename="soshbot-${asset.type}-${asset.platform}.png"`,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
