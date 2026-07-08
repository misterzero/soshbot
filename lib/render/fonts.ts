import { readFileSync } from "node:fs";
import { join } from "node:path";

export type FontSpec = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

let cached: FontSpec[] | null = null;

/** Bundled OFL-licensed fonts (assets/fonts). */
export function loadFonts(): FontSpec[] {
  if (cached) return cached;
  const dir = join(process.cwd(), "assets", "fonts");
  cached = [
    { name: "Big Shoulders", data: readFileSync(join(dir, "BigShoulders-Bold.ttf")), weight: 700, style: "normal" },
    { name: "Big Shoulders", data: readFileSync(join(dir, "BigShoulders-Regular.ttf")), weight: 400, style: "normal" },
    { name: "Outfit", data: readFileSync(join(dir, "Outfit-Bold.ttf")), weight: 700, style: "normal" },
    { name: "Outfit", data: readFileSync(join(dir, "Outfit-Regular.ttf")), weight: 400, style: "normal" },
  ];
  return cached;
}
