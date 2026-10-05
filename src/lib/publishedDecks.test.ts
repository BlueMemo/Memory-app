import { describe, expect, it } from "vitest";
import { largestCountries } from "@/decks/largest-countries";
import { deckSearchText, matchesQuery } from "./publishedDecks";

describe("deck search", () => {
  const text = deckSearchText(largestCountries);

  it("matches title and card text, ignoring case", () => {
    expect(matchesQuery(text, "LARGEST")).toBe(true);
    expect(matchesQuery(text, "chopsticks")).toBe(true);
    expect(matchesQuery(text, "tikka india")).toBe(true);
  });

  it("needs every word to match", () => {
    expect(matchesQuery(text, "india penguin")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesQuery(text, "  ")).toBe(true);
  });
});
