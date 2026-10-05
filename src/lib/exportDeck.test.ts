import { describe, expect, it } from "vitest";
import { largestCountries } from "@/decks/largest-countries";
import { deckToText, exportFileName } from "./exportDeck";
import { parseImport } from "./import/parse";
import type { Deck } from "./types";

const deck: Deck = {
  id: "user-x",
  title: "Franska glosor: åäö",
  description: "",
  language: "sv",
  kind: "unordered",
  instructions: [],
  cards: [
    { id: "a", prompt: "utomlands", answer: "à l'étranger", visualization: "En STRANGER, \"främling\"" },
    { id: "b", prompt: "flera,\tmånga", answer: "plusieurs" },
  ],
};

describe("exporting a deck", () => {
  it("writes tab-separated text the importer reads back", () => {
    const parsed = parseImport(deckToText(deck, "txt"), { separator: "auto", headerRow: "auto" });
    expect(parsed.usedHeaderRow).toBe(true);
    expect(parsed.rows).toEqual([
      ["utomlands", "à l'étranger", 'En STRANGER, "främling"', ""],
      ["flera, många", "plusieurs", "", ""],
    ]);
  });

  it("quotes CSV fields with commas or quotes", () => {
    const lines = deckToText(deck, "csv").trim().split("\r\n");
    expect(lines[1]).toBe('utomlands,à l\'étranger,"En STRANGER, ""främling""",');
  });

  it("numbers a memory route's stops", () => {
    const first = deckToText(largestCountries, "txt").split("\n")[1].split("\t");
    expect(first.slice(0, 2)).toEqual(["1", "India"]);
  });

  it("makes a safe file name", () => {
    expect(exportFileName(deck, "csv")).toBe("franska-glosor-aao.csv");
  });
});
