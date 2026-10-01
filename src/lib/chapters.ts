import type { Deck } from "./types";

// Big decks are learned in chapters: each chapter of CHAPTER_SIZE cards gets the full technique flow
// (walk-through → revision → test), and a final test covers the whole deck. Spaced repetition (FSRS)
// is unaffected and always works on the whole deck.

export const CHAPTER_SIZE = 10;

export function chapterCount(deck: Deck): number {
  return Math.max(1, Math.ceil(deck.cards.length / CHAPTER_SIZE));
}

export function hasChapters(deck: Deck): boolean {
  return deck.cards.length > CHAPTER_SIZE;
}

/** The first and last card positions in a chapter; positions and chapters both count from 1. */
export function chapterRange(deck: Deck, chapter: number): { from: number; to: number } {
  const from = (chapter - 1) * CHAPTER_SIZE + 1;
  return { from, to: Math.min(deck.cards.length, from + CHAPTER_SIZE - 1) };
}

/** Turns a ?chapter= value into a valid chapter number, or null for "the whole deck". */
export function parseChapter(deck: Deck, value: string | string[] | undefined): number | null {
  if (!hasChapters(deck) || typeof value !== "string") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(chapterCount(deck), Math.max(1, n));
}

/**
 * The deck as seen by one chapter: only its cards, with the author's notes moved to match.
 * `offset` is how many cards come before it, so stop numbers continue across chapters (stop 11, 12, ...).
 */
export function chapterDeck(deck: Deck, chapter: number): { deck: Deck; offset: number } {
  const { from, to } = chapterRange(deck, chapter);
  const offset = from - 1;
  const notes = deck.notes
    ?.filter((n) => n.beforeCard >= offset && n.beforeCard < to)
    .map((n) => ({ ...n, beforeCard: n.beforeCard - offset }));
  return { deck: { ...deck, cards: deck.cards.slice(offset, to), notes }, offset };
}
