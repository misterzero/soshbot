/**
 * Render pipeline (F3): JSX template → SVG (Satori) → PNG (resvg).
 */
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { ReactNode } from "react";
import { loadFonts } from "./fonts";

export type Platform = "ig_square" | "ig_story" | "fb_landscape";
export type AssetType = "daily" | "weekly" | "monthly";

export const PLATFORM_SIZES: Record<Platform, { w: number; h: number }> = {
  ig_square: { w: 1080, h: 1080 },
  ig_story: { w: 1080, h: 1920 },
  fb_landscape: { w: 1200, h: 630 },
};

export async function renderPng(element: ReactNode, platform: Platform): Promise<Buffer> {
  const { w, h } = PLATFORM_SIZES[platform];
  const svg = await satori(element, {
    width: w,
    height: h,
    fonts: loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng();
  return Buffer.from(png);
}

/** Read PNG dimensions from the IHDR chunk (for tests and sanity checks). */
export function pngDimensions(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24) return null;
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!isPng) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
