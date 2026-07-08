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
  const db = getDb();
  const asset = await db.query.assets.findFirst({ where: eq(schema.assets.id, id) });
  if (!asset) return new NextResponse("Not found", { status: 404 });

  const bytes = await getObject(`assets/${asset.imagePath}`);
  if (!bytes) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/png",
      "content-disposition": `inline; filename="soshbot-${asset.type}-${asset.platform}.png"`,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
