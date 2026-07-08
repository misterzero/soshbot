import { NextResponse } from "next/server";
import { syncAllSources } from "@/lib/sync/apply";

export const dynamic = "force-dynamic";

export async function POST() {
  const results = await syncAllSources();
  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 502 });
}
