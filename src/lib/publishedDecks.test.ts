import { describe, expect, it } from "vitest";
import { largestCountries } from "@/decks/largest-countries";
import { deckSearchText, matchesQuery, toSummary } from "./publishedDecks";

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

describe("toSummary", () => {
  const base = {
    id: "p1",
    author_id: "u1",
    source_deck_id: "user-1",
    version: 2,
    listed: true,
    created_at: "2026-10-07T10:00:00Z",
    title: "Swedish words",
    description: null,
    language: "sv" as const,
    kind: "unordered" as const,
    card_count: 31,
  };
  const people = { u1: { username: "erik", avatarUrl: null } };

  it("reads the deck's details from its own columns, without any cards", () => {
    const summary = toSummary(base, people);
    expect(summary).toMatchObject({ id: "p1", author: "erik", title: "Swedish words", description: "", kind: "unordered", language: "sv", cardCount: 31, version: 2 });
    expect("deck" in summary).toBe(false);
  });

  it("falls back to counting the cards when a row has no card_count", () => {
    const row = { ...base, card_count: null, deck: largestCountries };
    expect(toSummary(row, people).cardCount).toBe(largestCountries.cards.length);
  });

  it("shows official decks without a personal avatar", () => {
    const row = { ...base, official: true, show_avatar: true };
    expect(toSummary(row, { u1: { username: "erik", avatarUrl: "data:image/jpeg;base64,xx" } }).avatarUrl).toBeNull();
  });
});
