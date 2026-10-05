import { State, type StoredCard } from "./srs/core";

// Sort orders for card lists (the deck page's "What's inside" and the card browser). Cards have no
// timestamps of their own; new cards are always appended, so a card's position in its deck is its
// creation order.

export const CARD_SORTS = ["due-asc", "due-desc", "az", "za", "created-asc", "created-desc"] as const;
export type CardSort = (typeof CARD_SORTS)[number];

export interface SortableCard {
  /** What's asked: the prompt, or "Stop n" for memory routes. */
  question: string;
  /** Position in the deck (1-based) — also its creation order. */
  position: number;
  /** Spaced-repetition state, if the deck has it switched on. */
  enabled: boolean;
  stored?: StoredCard;
}

/** Due time for sorting: new cards and decks without spaced repetition go last. */
const dueTime = (c: SortableCard) =>
  c.enabled && c.stored && c.stored.state !== State.New ? new Date(c.stored.due).getTime() : Number.POSITIVE_INFINITY;

export function compareCards(a: SortableCard, b: SortableCard, sort: CardSort, locale: string): number {
  switch (sort) {
    case "due-asc":
    case "due-desc": {
      const x = dueTime(a);
      const y = dueTime(b);
      // Unscheduled cards stay at the end in both directions, in deck order.
      if (x === y) return a.position - b.position;
      if (!Number.isFinite(x)) return 1;
      if (!Number.isFinite(y)) return -1;
      return sort === "due-asc" ? x - y : y - x;
    }
    case "az":
    case "za": {
      const order = a.question.localeCompare(b.question, locale, { numeric: true, sensitivity: "base" });
      return (sort === "az" ? order : -order) || a.position - b.position;
    }
    case "created-desc":
      return b.position - a.position;
    default:
      return a.position - b.position;
  }
}
