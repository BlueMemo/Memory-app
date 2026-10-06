import type { Card } from "./types";

// Cards the learner answers by typing (spelling, vocabulary, names) instead of flipping. The check is
// forgiving about things that aren't spelling (capitals, punctuation, extra spaces, **bold** markers,
// alternatives written "a / b"), but accents and letters count: a missing accent or a one-letter slip is
// "almost", not correct. The learner still grades the card themselves; the verdict only suggests a grade.

export type AnswerMode = "show" | "type";

/** How a card is answered: its own choice, otherwise by showing the answer. */
export const answerModeOf = (card: Pick<Card, "answerMode">): AnswerMode => card.answerMode ?? "show";

/** The mode most of a deck's cards use, for the default of the next card added ("show" for an empty deck). */
export function majorityAnswerMode(cards: Pick<Card, "answerMode">[]): AnswerMode {
  const typed = cards.filter((c) => answerModeOf(c) === "type").length;
  return typed > cards.length - typed ? "type" : "show";
}

/** "none": all cards show the answer; "all": all cards are typed; otherwise some are. */
export function answerModeSummary(cards: Pick<Card, "answerMode">[]): { typed: number; total: number; state: "none" | "all" | "mixed" } {
  const typed = cards.filter((c) => answerModeOf(c) === "type").length;
  return { typed, total: cards.length, state: typed === 0 ? "none" : typed === cards.length ? "all" : "mixed" };
}

export type Verdict = "correct" | "almost" | "wrong" | "empty";

export interface TypedResult {
  verdict: Verdict;
  /** The accepted answer the typed text matched or came closest to (for showing differences). */
  expected: string;
}

/** Splits an answer into the forms that are accepted: "colour / color" accepts both; "(the) cat" also accepts "cat". */
export function acceptedAnswers(answer: string): string[] {
  const plain = answer.replace(/\*\*/g, "");
  const forms = new Set<string>();
  for (const part of plain.split(/[/;|]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    forms.add(trimmed);
    const withoutParens = trimmed.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    if (withoutParens) forms.add(withoutParens);
  }
  return [...forms];
}

/** Lower case, no punctuation, one space between words. Apostrophes vanish ("don't" = "dont"), hyphens become spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/['’‘`´]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const stripAccents = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");

/** Number of slips between two strings: inserting, deleting or changing a letter, or swapping two neighbours, each counting as one. */
export function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  const rows: number[][] = [Array.from({ length: y.length + 1 }, (_, j) => j)];
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++) {
      row[j] = Math.min(rows[i - 1][j] + 1, row[j - 1] + 1, rows[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) row[j] = Math.min(row[j], rows[i - 2][j - 2] + 1);
    }
    rows.push(row);
  }
  return rows[x.length][y.length];
}

/** How many slips still count as "almost": none for short words and anything with a number in it. */
function typoAllowance(expected: string): number {
  if (/\d/.test(expected)) return 0;
  const length = [...expected].length;
  return length <= 3 ? 0 : length <= 8 ? 1 : 2;
}

const RANK: Record<Verdict, number> = { correct: 3, almost: 2, wrong: 1, empty: 0 };

/** Compares what the learner typed with a card's answer. */
export function checkTypedAnswer(typed: string, answer: string): TypedResult {
  const forms = acceptedAnswers(answer);
  const fallback = forms[0] ?? answer;
  const input = normalize(typed);
  if (!input) return { verdict: "empty", expected: fallback };
  const bareInput = stripAccents(input);
  let best: TypedResult = { verdict: "wrong", expected: fallback };
  for (const form of forms) {
    const expected = normalize(form);
    let verdict: Verdict = "wrong";
    if (input === expected) verdict = "correct";
    else if (bareInput === stripAccents(expected)) verdict = "almost";
    else if (editDistance(bareInput, stripAccents(expected)) <= typoAllowance(expected)) verdict = "almost";
    if (RANK[verdict] > RANK[best.verdict]) best = { verdict, expected: form };
    if (verdict === "correct") break;
  }
  return best;
}

/** The grade a verdict suggests: Good, Hard for a near miss, Again otherwise (1 Again, 2 Hard, 3 Good). */
export function suggestedGrade(verdict: Verdict): 1 | 2 | 3 {
  return verdict === "correct" ? 3 : verdict === "almost" ? 2 : 1;
}

export interface Segment {
  text: string;
  /** True where this part of the typed text matches the expected answer. */
  ok: boolean;
}

/** The typed text split into runs that match the expected answer (longest common subsequence) and runs that don't. */
export function diffSegments(typed: string, expected: string): Segment[] {
  const a = [...typed];
  const b = [...expected];
  const same = (i: number, j: number) => a[i].toLowerCase() === b[j].toLowerCase();
  // lcs[i][j]: length of the longest common subsequence of a[i..] and b[j..].
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = same(i, j) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const flags: boolean[] = new Array(a.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (same(i, j)) {
      flags[i] = true;
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  const segments: Segment[] = [];
  a.forEach((char, i) => {
    const last = segments.at(-1);
    if (last && last.ok === flags[i]) last.text += char;
    else segments.push({ text: char, ok: flags[i] });
  });
  return segments;
}
