import { describe, expect, it } from "vitest";
import { EMPTY_ONBOARDING, normalizeGoals, officialDeckFor, parseOnboarding, recommendationKeywords, wantsExamDate } from "./onboarding";

describe("normalizeGoals", () => {
  it("keeps known answers", () => {
    expect(normalizeGoals({ goal: "languages", language: "spanish" })).toEqual({ goal: "languages", language: "spanish", level: null });
    expect(normalizeGoals({ goal: "school", level: "university" })).toEqual({ goal: "school", language: null, level: "university" });
  });

  it("drops a language or level that doesn't belong to the goal, and unknown values", () => {
    expect(normalizeGoals({ goal: "school", language: "spanish", level: "highSchool" })).toEqual({ goal: "school", language: null, level: "highSchool" });
    expect(normalizeGoals({ goal: "cooking", language: "klingon" })).toEqual({ goal: null, language: null, level: null });
    expect(normalizeGoals(null)).toEqual({ goal: null, language: null, level: null });
  });
});

describe("parseOnboarding", () => {
  it("starts empty and survives unreadable storage", () => {
    expect(parseOnboarding(null)).toEqual(EMPTY_ONBOARDING);
    expect(parseOnboarding("{oops")).toEqual(EMPTY_ONBOARDING);
  });

  it("reads progress flags", () => {
    const s = parseOnboarding(JSON.stringify({ goal: "general", tutorialPending: true, completedAt: "2026-10-07T10:00:00Z", sourceSent: true }));
    expect(s).toMatchObject({ goal: "general", tutorialPending: true, completedAt: "2026-10-07T10:00:00Z", sourceSent: true });
  });
});

describe("what the goals change", () => {
  it("searches community decks by the language's name in English and Swedish", () => {
    expect(recommendationKeywords({ goal: "languages", language: "french", level: null })).toEqual(["french", "franska"]);
    expect(recommendationKeywords({ goal: "languages", language: "other", level: null })).toEqual([]);
    expect(recommendationKeywords({ goal: "exams", language: null, level: null })).toEqual(["högskoleprov"]);
    expect(recommendationKeywords({ goal: "general", language: null, level: null })).toEqual([]);
  });

  it("picks the fitting official deck and who gets the exam date prompt", () => {
    expect(officialDeckFor("languages")).toBe("hello-10-languages");
    expect(officialDeckFor("general")).toBe("largest-countries");
    expect(wantsExamDate("school")).toBe(true);
    expect(wantsExamDate("exams")).toBe(true);
    expect(wantsExamDate("languages")).toBe(false);
    expect(wantsExamDate(null)).toBe(false);
  });
});
