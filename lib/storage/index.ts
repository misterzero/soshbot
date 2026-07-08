/**
 * Object storage abstraction (F2/F3 media + generated assets).
 * - Local/dev + CI: files under .data/ on disk.
 * - Production (Cloudflare Workers): the PROMO_ASSETS R2 bucket binding.
 * Keys are always server-generated (e.g. "media/<uuid>.png") — user input
 * never reaches a path or key.
 */
import { isCloudflareWorkers } from "../runtime";

type R2BucketLike = {
  put: (key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  get: (key: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
};

function r2(): R2BucketLike {
  // Lazy import so local builds never need the Workers context.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCloudflareContext } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
  const { env } = getCloudflareContext();
  const bucket = (env as Record<string, unknown>).PROMO_ASSETS as R2BucketLike | undefined;
  if (!bucket) throw new Error("PROMO_ASSETS R2 binding missing");
  return bucket;
}

const LOCAL_ROOT = ".data";

export async function putObject(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
  if (isCloudflareWorkers()) {
    await r2().put(key, bytes, { httpMetadata: { contentType } });
    return;
  }
  const { mkdirSync } = await import("node:fs");
  const { writeFile } = await import("node:fs/promises");
  const { dirname, join } = await import("node:path");
  const path = join(LOCAL_ROOT, key);
  mkdirSync(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  if (isCloudflareWorkers()) {
    const obj = await r2().get(key);
    if (!obj) return null;
    return new Uint8Array(await obj.arrayBuffer());
  }
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return new Uint8Array(await readFile(join(LOCAL_ROOT, key)));
  } catch {
    return null;
  }
}
