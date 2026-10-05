import { describe, expect, it } from "vitest";
import { largestCountries } from "@/decks/largest-countries";
import { chapterCount, chapterDeck, chapterRange, hasChapters, parseChapter } from "./chapters";
import type { Deck } from "./types";

const bigDeck = (n: number): Deck => ({
  ...largestCountries,
  id: "big",
  cards: Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, answer: `Answer ${i + 1}` })),
  notes: [
    { beforeCard: 2, badge: "A", title: "In chapter 1", body: "" },
    { beforeCard: 12, badge: "B", title: "In chapter 2", body: "" },
  ],
});

describe("chapters", () => {
  it("only splits decks with more than 10 cards", () => {
    expect(hasChapters(largestCountries, true)).toBe(false);
    expect(hasChapters(bigDeck(11), false)).toBe(false); // off unless switched on
    expect(hasChapters(bigDeck(11), true)).toBe(true);
    expect(chapterCount(bigDeck(23))).toBe(3);
  });

  it("covers every card exactly once, with a shorter last chapter", () => {
    const deck = bigDeck(23);
    expect([1, 2, 3].map((c) => chapterRange(deck, c))).toEqual([
      { from: 1, to: 10 },
      { from: 11, to: 20 },
      { from: 21, to: 23 },
    ]);
  });

  it("keeps stop numbers going across chapters and moves notes along", () => {
    const { deck, offset } = chapterDeck(bigDeck(23), 2);
    expect(offset).toBe(10);
    expect(deck.cards.map((c) => c.id)).toEqual(["c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20"]);
    expect(deck.notes).toEqual([{ beforeCard: 2, badge: "B", title: "In chapter 2", body: "" }]);
  });

  it("reads the chapter from the address, clamped to the deck", () => {
    const deck = bigDeck(23);
    expect(parseChapter(deck, "2", true)).toBe(2);
    expect(parseChapter(deck, "99", true)).toBe(3);
    expect(parseChapter(deck, "0", true)).toBe(1);
    expect(parseChapter(deck, "abc", true)).toBeNull();
    expect(parseChapter(deck, undefined, true)).toBeNull();
    expect(parseChapter(largestCountries, "2", true)).toBeNull(); // small decks have no chapters
  });
});
