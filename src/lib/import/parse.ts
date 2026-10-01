import { decodeHTML } from "entities";
import Papa from "papaparse";
import type { Card, Deck } from "../types";

// Turns pasted text or a CSV/TSV/TXT file (including Anki's "Notes in Plain Text" export) into cards.
// Pure functions, no React: the import page shows what this produces and lets the learner adjust it.

export type Separator = "tab" | "semicolon" | "pipe" | "arrow" | "equals" | "dash" | "colon" | "comma" | "none";

/** Detection order: most specific first; comma last because answers often contain commas. */
export const SEPARATORS: Exclude<Separator, "none">[] = ["tab", "semicolon", "pipe", "arrow", "equals", "dash", "colon", "comma"];

const DELIMITED: Partial<Record<Separator, string>> = { tab: "\t", semicolon: ";", pipe: "|", comma: "," };
const SPLITTERS: Partial<Record<Separator, RegExp>> = {
  arrow: /\s*(?:→|->|=>)\s*/,
  equals: /\s+=\s+/,
  dash: /\s+[-–—]\s+/,
  colon: /\s*:\s+/,
};

export type Role = "prompt" | "answer" | "visualization" | "note" | "ignore";
export type Kind = Deck["kind"];

/** Longer fields are allowed but flagged: a card is easier to picture when it's short. */
export const LONG_FIELD = 300;
export const MAX_CARDS = 5000;

export interface Parsed {
  rows: string[][];
  /** Column names from a header row or Anki's #columns line, if any. */
  header: string[] | null;
  separator: Separator;
  columnCount: number;
  /** Columns Anki marks as deck/notetype/tags/guid, ignored by default. */
  ignoreColumns: number[];
  /** True when the first row was used as column names. */
  usedHeaderRow: boolean;
}

export interface ParseOptions {
  separator: Separator | "auto";
  /** "auto" guesses from the first row. */
  headerRow: boolean | "auto";
}

const lines = (text: string) => text.replace(/\r\n?/g, "\n").split("\n");

const ANKI_SEPARATORS: Record<string, Separator> = {
  tab: "tab",
  comma: "comma",
  semicolon: "semicolon",
  pipe: "pipe",
  colon: "colon",
};

/** Reads Anki's export header lines (#separator:tab, #html:true, #columns:..., #deck column:2, ...). */
export function readAnkiHeader(all: string[]) {
  let separator: Separator | undefined;
  let columns: string[] | undefined;
  const ignoreColumns: number[] = [];
  let bodyStart = 0;
  for (; bodyStart < all.length; bodyStart++) {
    const m = /^#([a-z ]+):(.*)$/i.exec(all[bodyStart].trim());
    if (!m) break;
    const key = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (key === "separator") separator = ANKI_SEPARATORS[value.toLowerCase()];
    else if (key === "columns") columns = value.split(/\t|[,;|]/).map((c) => c.trim());
    else if (/^(deck|notetype|tags|guid) column$/.test(key)) {
      const col = Number.parseInt(value, 10);
      if (col > 0) ignoreColumns.push(col - 1);
    }
  }
  return { separator, columns, ignoreColumns, bodyStart };
}

export function detectSeparator(body: string[]): Separator {
  const filled = body.filter((l) => l.trim() !== "");
  if (filled.length === 0) return "none";
  for (const sep of SEPARATORS) {
    const test = DELIMITED[sep] ?? SPLITTERS[sep]!;
    const hits = filled.filter((l) => (typeof test === "string" ? l.includes(test) : test.test(l))).length;
    if (hits / filled.length >= 0.8) return sep;
  }
  return "none";
}

/** Removes list numbering and bullets: "1. India", "2) China", "- Brazil", "• Russia". */
export function stripListMarker(s: string): string {
  return s.replace(/^\s*(?:\d+\s*[.)]|[-*•–])\s+/, "");
}

/** Anki stores formatting as HTML (with entities like &eacute;); cards here are plain text. */
export function stripHtml(s: string): string {
  const withoutTags = s.replace(/<br\s*\/?>|<\/(?:div|p|li)>/gi, " ").replace(/<[^>]+>/g, "");
  return decodeHTML(withoutTags).replace(/\s+/g, " ").trim();
}

const HEADER_WORDS =
  /^(front|back|question|answer|prompt|term|definition|word|translation|meaning|note|notes|extra|cue|scene|memory queue|visualization|fråga|svar|framsida|baksida|ord|översättning|anteckning)$/i;

function looksLikeHeader(row: string[]): boolean {
  return row.length > 1 && row.every((c) => HEADER_WORDS.test(c.trim()));
}

export function parseImport(text: string, options: ParseOptions): Parsed {
  const all = lines(text);
  const anki = readAnkiHeader(all);
  const body = all.slice(anki.bodyStart);
  const separator = options.separator === "auto" ? (anki.separator ?? detectSeparator(body)) : options.separator;

  let rows: string[][];
  const delimiter = DELIMITED[separator];
  const splitter = SPLITTERS[separator];
  if (delimiter) {
    // Papa Parse handles quoted cells, e.g. "Paris, France" in a comma-separated file.
    const result = Papa.parse<string[]>(body.join("\n"), { delimiter, skipEmptyLines: "greedy" });
    rows = result.data;
  } else if (splitter) {
    rows = body.filter((l) => l.trim() !== "").map((l) => l.split(splitter));
  } else {
    rows = body.filter((l) => l.trim() !== "").map((l) => [stripListMarker(l)]);
  }

  const hasHtml = rows.some((r) => r.some((c) => /<\/?[a-z][^>]*>|&[a-z#0-9]+;/i.test(c)));
  rows = rows.map((r) => r.map((c) => (hasHtml ? stripHtml(c) : c.trim())));

  let header: string[] | null = anki.columns ?? null;
  const useHeaderRow = !anki.columns && rows.length > 1 && (options.headerRow === "auto" ? looksLikeHeader(rows[0]) : options.headerRow);
  if (useHeaderRow) {
    header = rows[0];
    rows = rows.slice(1);
  }

  const columnCount = Math.max(1, ...rows.map((r) => r.length), header?.length ?? 0);
  return { rows, header, separator, columnCount, ignoreColumns: anki.ignoreColumns, usedHeaderRow: useHeaderRow };
}

const ROLE_BY_NAME: [RegExp, Role][] = [
  [/^(front|question|prompt|term|word|fråga|framsida|ord)$/i, "prompt"],
  [/^(back|answer|definition|translation|meaning|svar|baksida|översättning)$/i, "answer"],
  [/^(cue|scene|memory queue|visualization)$/i, "visualization"],
  [/^(note|notes|extra|anteckning)$/i, "note"],
];

/** A first guess at what each column is: by column name if there is one, otherwise by position. */
export function defaultRoles(parsed: Pick<Parsed, "columnCount" | "header" | "ignoreColumns">): Role[] {
  const roles: Role[] = Array.from({ length: parsed.columnCount }, () => "ignore");
  const usable = roles.map((_, i) => i).filter((i) => !parsed.ignoreColumns.includes(i));

  if (parsed.header) {
    for (const i of usable) {
      const name = parsed.header[i]?.trim() ?? "";
      const match = ROLE_BY_NAME.find(([re]) => re.test(name));
      if (match && !roles.includes(match[1])) roles[i] = match[1];
    }
    if (roles.includes("answer")) return roles;
    roles.fill("ignore"); // names didn't tell us enough; fall back to positions
  }

  const byPosition: Role[][] = [["answer"], ["prompt", "answer"], ["prompt", "answer", "visualization"], ["prompt", "answer", "visualization", "note"]];
  const pattern = byPosition[Math.min(usable.length, 4) - 1] ?? [];
  pattern.forEach((role, k) => (roles[usable[k]] = role));
  return roles;
}

/** Decks without a prompt column are lists, which become memory routes in the order given. */
export function suggestKind(roles: Role[]): Kind {
  return roles.includes("prompt") ? "unordered" : "ordered";
}

export interface Draft {
  prompt: string;
  answer: string;
  visualization: string;
  note: string;
}

export type Problem = "noAnswer" | "noPrompt" | "duplicate" | "tooLong";
/** Rows with these problems can't become cards and are skipped. */
export const BLOCKING: Problem[] = ["noAnswer", "noPrompt"];

export function rowToDraft(row: string[], roles: Role[]): Draft {
  const pick = (role: Role) =>
    roles
      .map((r, i) => (r === role ? (row[i] ?? "").trim() : ""))
      .filter(Boolean)
      .join(" ");
  return { prompt: pick("prompt"), answer: pick("answer"), visualization: pick("visualization"), note: pick("note") };
}

/** Problems for every row; duplicates are rows whose question (or, for routes, answer) appeared earlier. */
export function findProblems(drafts: Draft[], kind: Kind): Problem[][] {
  const seen = new Set<string>();
  return drafts.map((d) => {
    const problems: Problem[] = [];
    if (!d.answer) problems.push("noAnswer");
    if (kind === "unordered" && !d.prompt) problems.push("noPrompt");
    const key = (kind === "unordered" ? `${d.prompt}\u0000${d.answer}` : d.answer).toLowerCase();
    if (d.answer && seen.has(key)) problems.push("duplicate");
    seen.add(key);
    if ([d.prompt, d.answer, d.visualization, d.note].some((f) => f.length > LONG_FIELD)) problems.push("tooLong");
    return problems;
  });
}

export function draftToCard(d: Draft, kind: Kind, id: string): Card {
  const card: Card = { id, answer: d.answer };
  if (kind === "unordered") card.prompt = d.prompt;
  if (d.visualization) card.visualization = d.visualization;
  if (d.note) card.note = d.note;
  return card;
}
