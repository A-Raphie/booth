/** Script parsing + token-level fuzzy alignment. Pure functions. */

export type ScriptLine = { n: number; text: string; tokens: string[] };

const PUNCT = /[^\p{L}\p{N}']/gu;

export function normalizeToken(t: string): string {
  return t.toLowerCase().replace(PUNCT, "");
}

export function tokenize(text: string): string[] {
  // split on whitespace, hyphens, and slashes first: STT renders "fifty fifty"
  // as "50/50" and "low acid" as "low-acid", which must match script tokens
  return text
    .split(/[\s\-–—/]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17",
  eighteen: "18", nineteen: "19", twenty: "20", thirty: "30", forty: "40",
  fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  hundred: "100", thousand: "1000", half: "0.5", quarter: "0.25",
};

/** Map a number word ("twelve") or numeral ("12") to a canonical value, else null. */
export function numericValue(token: string): string | null {
  const t = normalizeToken(token);
  if (NUMBER_WORDS[t]) return NUMBER_WORDS[t];
  if (/^\d+([.,]\d+)?$/.test(t)) return t.replace(",", ".");
  return null;
}

export function parseScript(text: string): ScriptLine[] {
  const raw = text.split(/\n+/);
  const lines: ScriptLine[] = [];
  let n = 0;
  for (const line of raw) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,3}\s/.test(trimmed)) continue; // markdown headings
    n += 1;
    lines.push({ n, text: trimmed, tokens: tokenize(trimmed) });
  }
  return lines;
}

/** Levenshtein distance over token arrays. */
export function tokenLevenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Similarity of two token sequences, 0..1. */
export function tokenRatio(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const dist = tokenLevenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

export type LineCoverage = {
  line: number;
  score: number; // best window similarity
  covered: boolean;
  flubbed: boolean;
  numericFlub: boolean; // a number in the script was read as a different number
};

// Tunable thresholds for the client-side backup judge.
const COVER_MIN = 0.55;
const CLEAN_MIN = 0.78;

/**
 * Score which script lines a spoken segment covers and how well.
 * The agent's LLM is the primary judge; this is the UI + nudge fallback.
 */
export function scoreSegmentAgainstScript(
  segmentTokens: string[],
  lines: ScriptLine[],
): LineCoverage[] {
  const out: LineCoverage[] = [];
  for (const line of lines) {
    const w = line.tokens.length;
    if (w === 0 || segmentTokens.length === 0) {
      out.push({ line: line.n, score: 0, covered: false, flubbed: false, numericFlub: false });
      continue;
    }
    let best = 0;
    let bestStart = 0;
    const window = w + 2;
    for (let start = 0; start + w <= segmentTokens.length + 1; start++) {
      const slice = segmentTokens.slice(start, start + window);
      const r = tokenRatio(line.tokens, slice);
      if (r > best) {
        best = r;
        bestStart = start;
      }
      if (best > 0.95) break;
    }
    // short lines: also allow a prefix match against segment start
    if (best < COVER_MIN && w <= 4) {
      const head = segmentTokens.slice(0, w + 1);
      const r = tokenRatio(line.tokens, head);
      if (r > best) {
        best = r;
        bestStart = 0;
      }
    }

    // Numbers are where VO flubs live: a read of "two" for "four" scores 86%
    // on a 7-word line, so similarity alone can't be trusted for them.
    const matchWindow = segmentTokens.slice(bestStart, bestStart + w + 2);
    const scriptNums = line.tokens.map(numericValue).filter((v): v is string => v !== null).sort();
    const readNums = matchWindow.map(numericValue).filter((v): v is string => v !== null).sort();
    const numericFlub =
      scriptNums.length > 0 &&
      (scriptNums.length !== readNums.length || scriptNums.some((v, i) => v !== readNums[i]));

    out.push({
      line: line.n,
      score: best,
      covered: best >= COVER_MIN,
      flubbed: numericFlub || (best >= 0.4 && best < CLEAN_MIN),
      numericFlub,
    });
  }
  return out;
}

/** The one paragraph of direction rules injected into the agent prompt. */
export function buildSystemPrompt(lines: ScriptLine[]): string {
  const numbered = lines.map((l) => `${l.n}. ${l.text}`).join("\n");
  return [
    "You are the director inside a voiceover recording booth. The talent reads the script below aloud, one line at a time, and you deliver a clean master by cutting flubs the moment they happen.",
    "",
    "SCRIPT:",
    numbered,
    "",
    "RULES:",
    "- Track the read against the script using the live transcript.",
    "- FLUBS are: misread words, skipped or inserted words, wrong numbers or names, stumbles, false starts, repeated phrases. When you detect one, cut in at once. Say: 'Cut.' then the line number and the correction in under 12 words. Example: 'Cut. Line four: it's twenty grams, not twelve. Again from line four.' Immediately after, call call_retake with from_line and reason.",
    "- Keep every cut under 12 words. Never explain grammar. Never read the script aloud for the talent.",
    "- CLEAN READS: when a line or short stretch reads clean, call mark_take with quality=clean and the line range. Say 'That's a print.' or 'Good, keep it moving.' occasionally. Vary your phrasing; never say the same phrase twice in a row.",
    "- If the talent goes silent mid-line for more than five seconds, say: 'From the top of line N.' using the last line they started.",
    "- Speak ONLY booth direction. Ignore anything unrelated to the read.",
    "- When the talent says 'that's a wrap' or the whole script is read clean, call finalize with a one-line summary.",
  ].join("\n");
}

export const DIRECTOR_GREETING =
  "Step up to the glass. Read line one whenever you're ready. I'll call the cuts.";
