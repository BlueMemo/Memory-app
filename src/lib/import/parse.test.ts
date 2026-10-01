import { describe, expect, it } from "vitest";
import {
  defaultRoles,
  detectSeparator,
  draftToCard,
  findProblems,
  parseImport,
  rowToDraft,
  stripHtml,
  stripListMarker,
  suggestKind,
} from "./parse";

const auto = { separator: "auto", headerRow: "auto" } as const;

describe("pasted lists", () => {
  it("turns a plain or numbered list into a memory route", () => {
    const parsed = parseImport("1. India\n2. China\n\n3) United States\n- Indonesia", auto);
    expect(parsed.separator).toBe("none");
    expect(parsed.rows).toEqual([["India"], ["China"], ["United States"], ["Indonesia"]]);
    const roles = defaultRoles(parsed);
    expect(roles).toEqual(["answer"]);
    expect(suggestKind(roles)).toBe("ordered");
  });

  it("splits 'prompt - answer' lines into associations", () => {
    const parsed = parseImport("Spanish - Hola\nFrench - Bonjour\nJapanese – Konnichiwa", auto);
    expect(parsed.separator).toBe("dash");
    expect(parsed.rows).toEqual([["Spanish", "Hola"], ["French", "Bonjour"], ["Japanese", "Konnichiwa"]]);
    expect(suggestKind(defaultRoles(parsed))).toBe("unordered");
  });

  it("doesn't mistake hyphenated words for a separator", () => {
    expect(detectSeparator(["Coca-Cola", "Jean-Paul Sartre", "well-known"])).toBe("none");
  });

  it("supports arrows, equals signs and colons", () => {
    expect(parseImport("dog -> hund\ncat → katt", auto).rows).toEqual([["dog", "hund"], ["cat", "katt"]]);
    expect(parseImport("dog = hund\ncat = katt", auto).separator).toBe("equals");
    expect(parseImport("dog: hund\ncat: katt", auto).separator).toBe("colon");
  });
});

describe("files", () => {
  it("reads CSV with quoted commas and a header row", () => {
    const csv = 'Question,Answer,Note\nCapital of France,"Paris, on the Seine",big city\nCapital of Japan,Tokyo,';
    const parsed = parseImport(csv, auto);
    expect(parsed.separator).toBe("comma");
    expect(parsed.usedHeaderRow).toBe(true);
    expect(parsed.rows[0]).toEqual(["Capital of France", "Paris, on the Seine", "big city"]);
    expect(defaultRoles(parsed)).toEqual(["prompt", "answer", "note"]);
  });

  it("reads Anki's plain text export, skipping its deck and notetype columns and HTML", () => {
    const anki = [
      "#separator:tab",
      "#html:true",
      "#notetype column:1",
      "#deck column:2",
      "Basic\tSpanish\t<b>Hola</b>\tHello<br>(informal)",
      "Basic\tSpanish\tAdi&oacute;s\tGoodbye",
    ].join("\n");
    const parsed = parseImport(anki, auto);
    expect(parsed.separator).toBe("tab");
    expect(parsed.ignoreColumns).toEqual([0, 1]);
    expect(parsed.rows[0]).toEqual(["Basic", "Spanish", "Hola", "Hello (informal)"]);
    expect(parsed.rows[1][2]).toBe("Adiós");
    expect(defaultRoles(parsed)).toEqual(["ignore", "ignore", "prompt", "answer"]);
  });

  it("lets the learner override the separator and header guess", () => {
    const parsed = parseImport("a;b\nc;d", { separator: "none", headerRow: false });
    expect(parsed.rows).toEqual([["a;b"], ["c;d"]]);
  });
});

describe("cleanup helpers", () => {
  it("strips HTML and decodes entities", () => {
    expect(stripHtml("<div>Caf&eacute; &amp; <i>bar</i></div><div>next&nbsp;line</div>")).toBe("Café & bar next line");
    expect(stripHtml("Tom &amp; Jerry &#233; &#x41; &auml;")).toBe("Tom & Jerry é A ä");
  });

  it("strips list markers but leaves normal text alone", () => {
    expect(stripListMarker("12. Brazil")).toBe("Brazil");
    expect(stripListMarker("• Russia")).toBe("Russia");
    expect(stripListMarker("2024 was a year")).toBe("2024 was a year");
  });
});

describe("turning rows into cards", () => {
  it("flags rows that can't become cards, duplicates and very long fields", () => {
    const roles = ["prompt", "answer"] as const;
    const drafts = [["Spanish", "Hola"], ["French", ""], ["", "Ciao"], ["Spanish", "Hola"], ["German", "x".repeat(400)]].map((r) =>
      rowToDraft(r, [...roles]),
    );
    expect(findProblems(drafts, "unordered")).toEqual([[], ["noAnswer"], ["noPrompt"], ["duplicate"], ["tooLong"]]);
    // In a route, rows only need an answer.
    expect(findProblems(drafts, "ordered")[2]).toEqual([]);
  });

  it("joins columns given the same role and builds cards without empty fields", () => {
    const draft = rowToDraft(["Japan", "Tokyo", "a TOKEN", "", "capital"], ["prompt", "answer", "visualization", "note", "note"]);
    expect(draft).toEqual({ prompt: "Japan", answer: "Tokyo", visualization: "a TOKEN", note: "capital" });
    expect(draftToCard(draft, "ordered", "x")).toEqual({ id: "x", answer: "Tokyo", visualization: "a TOKEN", note: "capital" });
    expect(draftToCard({ ...draft, visualization: "", note: "" }, "unordered", "y")).toEqual({ id: "y", answer: "Tokyo", prompt: "Japan" });
  });
});
