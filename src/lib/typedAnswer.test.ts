import { describe, expect, it } from "vitest";
import {
  acceptedAnswers,
  answerModeOf,
  answerModeSummary,
  checkTypedAnswer,
  diffSegments,
  editDistance,
  majorityAnswerMode,
  normalize,
  suggestedGrade,
} from "./typedAnswer";

const verdict = (typed: string, answer: string) => checkTypedAnswer(typed, answer).verdict;

describe("normalize", () => {
  it("ignores case, punctuation and extra spaces", () => {
    expect(normalize("  The   CAT!  ")).toBe("the cat");
  });

  it("drops apostrophes and turns hyphens into spaces", () => {
    expect(normalize("Don’t")).toBe("dont");
    expect(normalize("mother-in-law")).toBe("mother in law");
  });

  it("keeps accented letters and digits", () => {
    expect(normalize("Älg 42")).toBe("älg 42");
  });
});

describe("acceptedAnswers", () => {
  it("splits alternatives", () => {
    expect(acceptedAnswers("colour / color")).toEqual(["colour", "color"]);
    expect(acceptedAnswers("a; b | c")).toEqual(["a", "b", "c"]);
  });

  it("also accepts the answer without a parenthesised part", () => {
    expect(acceptedAnswers("(the) cat")).toEqual(["(the) cat", "cat"]);
  });

  it("strips bold markers", () => {
    expect(acceptedAnswers("**Hola**")).toEqual(["Hola"]);
  });
});

describe("checkTypedAnswer", () => {
  it("accepts an exact answer, ignoring case and punctuation", () => {
    expect(verdict("hola", "Hola")).toBe("correct");
    expect(verdict("  new   york ", "New York!")).toBe("correct");
  });

  it("accepts any of the listed alternatives", () => {
    expect(verdict("color", "colour / color")).toBe("correct");
    expect(verdict("cat", "(the) cat")).toBe("correct");
    expect(verdict("the cat", "(the) cat")).toBe("correct");
  });

  it("calls a missing accent almost", () => {
    expect(verdict("cafe", "café")).toBe("almost");
    expect(verdict("alg", "älg")).toBe("almost");
  });

  it("calls a one-letter slip in a longer word almost", () => {
    expect(verdict("recieve", "receive")).toBe("almost");
    expect(verdict("restaraunt", "restaurant")).toBe("almost");
  });

  it("is strict with short answers and with numbers", () => {
    expect(verdict("cot", "cat")).toBe("wrong");
    expect(verdict("1947", "1948")).toBe("wrong");
    expect(verdict("3.15", "3.14")).toBe("wrong");
  });

  it("calls a different answer wrong", () => {
    expect(verdict("banana", "apple")).toBe("wrong");
  });

  it("reports nothing typed as empty", () => {
    expect(verdict("   ", "Hola")).toBe("empty");
  });

  it("returns the alternative that matched", () => {
    expect(checkTypedAnswer("color", "colour / color").expected).toBe("color");
  });
});

describe("suggestedGrade", () => {
  it("suggests Good, Hard or Again", () => {
    expect(suggestedGrade("correct")).toBe(3);
    expect(suggestedGrade("almost")).toBe(2);
    expect(suggestedGrade("wrong")).toBe(1);
    expect(suggestedGrade("empty")).toBe(1);
  });
});

describe("editDistance", () => {
  it("counts single-letter edits", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("same", "same")).toBe(0);
    expect(editDistance("ab", "ba")).toBe(1);
    expect(editDistance("recieve", "receive")).toBe(1);
  });
});

describe("diffSegments", () => {
  it("keeps the typed text intact and marks only the stray letters", () => {
    const segments = diffSegments("recieve", "receive");
    expect(segments.map((s) => s.text).join("")).toBe("recieve");
    // One letter is out of place; everything else lines up with the expected word.
    expect(segments.filter((s) => !s.ok).map((s) => s.text.length)).toEqual([1]);
  });

  it("is all ok for identical text and all wrong for nothing in common", () => {
    expect(diffSegments("cat", "Cat")).toEqual([{ text: "cat", ok: true }]);
    expect(diffSegments("xyz", "abc")).toEqual([{ text: "xyz", ok: false }]);
    expect(diffSegments("", "abc")).toEqual([]);
  });
});

describe("answer modes", () => {
  it("defaults to showing the answer", () => {
    expect(answerModeOf({})).toBe("show");
    expect(answerModeOf({ answerMode: "type" })).toBe("type");
  });

  it("finds the mode most cards use", () => {
    expect(majorityAnswerMode([])).toBe("show");
    expect(majorityAnswerMode([{ answerMode: "type" }, { answerMode: "type" }, {}])).toBe("type");
    expect(majorityAnswerMode([{ answerMode: "type" }, {}])).toBe("show");
  });

  it("summarises a deck", () => {
    expect(answerModeSummary([{}, {}])).toEqual({ typed: 0, total: 2, state: "none" });
    expect(answerModeSummary([{ answerMode: "type" }, {}])).toEqual({ typed: 1, total: 2, state: "mixed" });
    expect(answerModeSummary([{ answerMode: "type" }])).toEqual({ typed: 1, total: 1, state: "all" });
  });
});
