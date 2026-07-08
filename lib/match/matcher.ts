/**
 * Entertainer fuzzy matcher (F1).
 * Links raw iCal event titles to entertainer profiles by normalized
 * containment and Levenshtein similarity against names + aliases.
 */

export type MatchCandidate = {
  id: string;
  name: string;
  matchAliases?: string[] | null;
};

export type MatchResult = {
  entertainerId: string;
  confidence: number; // 0..1
};

/** Auto-link at or above this confidence; below it, send to review queue. */
export const AUTO_LINK_THRESHOLD = 0.8;

const STOPWORDS = new Set([
  "the", "a", "an", "live", "band", "duo", "trio", "quartet",
  "feat", "featuring", "ft", "presents", "with", "night", "show",
]);

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t))
    .join(" ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Score one title against one candidate (best of name + aliases).
 * Containment of the full normalized name scores 0.95; otherwise
 * whole-string Levenshtein similarity.
 */
export function scoreCandidate(title: string, candidate: MatchCandidate): number {
  const nTitle = normalize(title);
  const names = [candidate.name, ...(candidate.matchAliases ?? [])];
  let best = 0;
  for (const name of names) {
    const nName = normalize(name);
    if (!nName) continue;
    if (nTitle === nName) return 1;
    if (nTitle.includes(nName)) {
      best = Math.max(best, 0.95);
      continue;
    }
    best = Math.max(best, similarity(nTitle, nName));
  }
  return best;
}

/** Best match for a title across all candidates, or null if nothing plausible. */
export function matchTitle(
  title: string,
  candidates: MatchCandidate[],
  minConfidence = 0.6
): MatchResult | null {
  let best: MatchResult | null = null;
  for (const c of candidates) {
    const score = scoreCandidate(title, c);
    if (score >= minConfidence && (!best || score > best.confidence)) {
      best = { entertainerId: c.id, confidence: score };
    }
  }
  return best;
}
