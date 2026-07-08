import { describe, expect, it } from "vitest";
import { AUTO_LINK_THRESHOLD, levenshtein, matchTitle, normalize, scoreCandidate } from "./matcher";

const CANDIDATES = [
  { id: "ent-1", name: "The Hi-Tones", matchAliases: ["Hi Tones", "Hi-Tones Trio"] },
  { id: "ent-2", name: "Marlene & the Moonshiners", matchAliases: ["Moonshiners"] },
  { id: "ent-3", name: "DJ Kelpforest", matchAliases: ["Kelpforest", "DJ Kelp"] },
];

describe("normalize", () => {
  it("lowercases, strips punctuation and stopwords", () => {
    expect(normalize("The Hi-Tones LIVE!")).toBe("hi tones");
    expect(normalize("Marlene & the Moonshiners")).toBe("marlene moonshiners");
  });

  it("strips diacritics", () => {
    expect(normalize("Café Túnez")).toBe("cafe tunez");
  });
});

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });
});

describe("scoreCandidate / matchTitle", () => {
  it("matches exact normalized titles at 1.0", () => {
    expect(scoreCandidate("Hi Tones", CANDIDATES[0])).toBe(1);
  });

  it("matches containment at 0.95 (auto-link)", () => {
    const result = matchTitle("Surf Saturday: The Hi-Tones", CANDIDATES);
    expect(result?.entertainerId).toBe("ent-1");
    expect(result!.confidence).toBeGreaterThanOrEqual(AUTO_LINK_THRESHOLD);
  });

  it("matches misspellings via similarity", () => {
    const result = matchTitle("Hi Tonez", CANDIDATES);
    expect(result?.entertainerId).toBe("ent-1");
    expect(result!.confidence).toBeGreaterThan(0.8);
  });

  it("matches aliases", () => {
    const result = matchTitle("Moonshiners at the Anchor", CANDIDATES);
    expect(result?.entertainerId).toBe("ent-2");
  });

  it("returns null for unrelated titles (review queue)", () => {
    expect(matchTitle("Trivia Night", CANDIDATES)).toBeNull();
    expect(matchTitle("Karaoke", CANDIDATES)).toBeNull();
  });
});
