import { describe, expect, it } from "vitest";
import { hasUnpublishedChanges, type PublishedDeck } from "./publishedDecks";
import type { Deck } from "./types";

const deck: Deck = {
  id: "d1",
  title: "Spanish",
  description: "Words",
  kind: "unordered",
  language: "en",
  cards: [{ id: "c1", prompt: "hola", answer: "hello" }],
} as Deck;
const published = (d: Deck) => ({ deck: JSON.parse(JSON.stringify(d)) }) as PublishedDeck;

describe("hasUnpublishedChanges", () => {
  it("ignores key order (the database reorders jsonb keys)", () => {
    const reordered = { ...published(deck), deck: { cards: [{ answer: "hello", prompt: "hola", id: "c1" }], language: "en", kind: "unordered", description: "Words", title: "Spanish", id: "d1" } as Deck };
    expect(hasUnpublishedChanges(deck, reordered)).toBe(false);
  });
  it("sees added and edited cards", () => {
    expect(hasUnpublishedChanges({ ...deck, cards: [...deck.cards, { id: "c2", prompt: "adiós", answer: "bye" } as Deck["cards"][number]] }, published(deck))).toBe(true);
    expect(hasUnpublishedChanges({ ...deck, cards: [{ ...deck.cards[0], answer: "hi" }] }, published(deck))).toBe(true);
  });
});
