import { describe, expect, it } from "vitest";
import { largestCountries } from "@/decks/largest-countries";
import { parseOverrides, resolveDeck } from "./deckOverrides";

describe("personal versions of saved decks", () => {
  it("uses the learner's version when there is one, otherwise the original", () => {
    const mine = { ...largestCountries, title: "My countries" };
    expect(resolveDeck(largestCountries, {})).toBe(largestCountries);
    expect(resolveDeck(largestCountries, { [largestCountries.id]: mine })).toBe(mine);
    expect(resolveDeck(largestCountries, { "other-deck": mine })).toBe(largestCountries);
  });

  it("survives missing or damaged storage", () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides("not json")).toEqual({});
    expect(parseOverrides("[1, 2]")).toEqual({});
    expect(parseOverrides('{"a": {"id": "a"}}')).toEqual({ a: { id: "a" } });
  });
});
