import { describe, expect, it } from "vitest";
import { pngDimensions, renderPng } from "./pipeline";
import { DailyPost, MonthlyCalendar, WeeklyLineup, DEFAULT_COLORS } from "./templates";

const common = { venueName: "The Rusty Anchor Taproom", colors: DEFAULT_COLORS };

describe("renderPng", () => {
  it("renders a daily post at 1080x1080", async () => {
    const png = await renderPng(
      <DailyPost
        {...common}
        actName="The Hi-Tones"
        hook="Reverb-drenched surf rock trio."
        whenLine="Saturday, August 1 · 8:00 PM"
        space="main stage"
        photoDataUri={null}
        size={{ w: 1080, h: 1080 }}
      />,
      "ig_square"
    );
    expect(pngDimensions(png)).toEqual({ w: 1080, h: 1080 });
  }, 30_000);

  it("renders a weekly lineup at story size", async () => {
    const png = await renderPng(
      <WeeklyLineup
        {...common}
        rows={[
          { day: "Fri", act: "The Hi-Tones" },
          { day: "Sat", act: "DJ Kelpforest" },
        ]}
        size={{ w: 1080, h: 1920 }}
      />,
      "ig_story"
    );
    expect(pngDimensions(png)).toEqual({ w: 1080, h: 1920 });
  }, 30_000);

  it("renders a monthly calendar at fb landscape size", async () => {
    const weeks = Array.from({ length: 5 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => ({
        day: w * 7 + d + 1 <= 31 ? w * 7 + d + 1 : null,
        hasEvent: (w * 7 + d) % 9 === 0,
        label: (w * 7 + d) % 9 === 0 ? "The Hi-Tones" : null,
      }))
    );
    const png = await renderPng(
      <MonthlyCalendar {...common} monthLabel="August" weeks={weeks} size={{ w: 1200, h: 630 }} />,
      "fb_landscape"
    );
    expect(pngDimensions(png)).toEqual({ w: 1200, h: 630 });
  }, 30_000);
});

describe("pngDimensions", () => {
  it("returns null for non-png data", () => {
    expect(pngDimensions(Buffer.from("not a png, definitely not"))).toBeNull();
  });
});
