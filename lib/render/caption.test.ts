import { describe, expect, it } from "vitest";
import { buildDailyCaption, buildWeeklyCaption } from "./caption";

const brand = {
  venueName: "The Rusty Anchor Taproom",
  hashtags: ["#rustyanchor", "#livemusic"],
};

const hiTones = {
  name: "The Hi-Tones",
  bioShort: "Reverb-drenched surf rock trio.",
  socials: { instagram: "@thehitones", bandcamp: "hitones" },
};

describe("buildDailyCaption", () => {
  it("includes act, venue, time, handles, and hashtags", () => {
    const caption = buildDailyCaption(
      { title: "The Hi-Tones LIVE", startsAt: new Date("2026-08-01T20:00:00-04:00"), space: "main stage" },
      hiTones,
      brand
    );
    expect(caption).toContain("The Hi-Tones takes the main stage at The Rusty Anchor Taproom!");
    expect(caption).toContain("Reverb-drenched surf rock trio.");
    expect(caption).toContain("Saturday, August 1");
    expect(caption).toContain("Follow @thehitones");
    expect(caption).not.toContain("Follow @thehitones hitones"); // non-@ handles excluded
    expect(caption).toContain("#rustyanchor #livemusic");
  });

  it("falls back to the event title when no entertainer is linked", () => {
    const caption = buildDailyCaption(
      { title: "Trivia Night", startsAt: new Date("2026-08-05T19:00:00-04:00"), space: "taproom" },
      null,
      brand
    );
    expect(caption).toContain("Trivia Night at The Rusty Anchor Taproom!");
  });
});

describe("buildWeeklyCaption", () => {
  it("lists each event by weekday", () => {
    const caption = buildWeeklyCaption(
      [
        {
          event: { title: "x", startsAt: new Date("2026-08-07T20:00:00-04:00") },
          entertainer: hiTones,
        },
        {
          event: { title: "Trivia Night", startsAt: new Date("2026-08-05T19:00:00-04:00") },
          entertainer: null,
        },
      ],
      brand
    );
    expect(caption).toContain("This week at The Rusty Anchor Taproom:");
    expect(caption).toContain("Fri — The Hi-Tones");
    expect(caption).toContain("Wed — Trivia Night");
  });
});
