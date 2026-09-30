import { describe, expect, it } from "vitest";
import { helloTenLanguages } from "@/decks/hello";
import { largestCountries } from "@/decks/largest-countries";
import {
  buildSteps,
  deckTestQuestion,
  fill,
  initReviewSession,
  initSession,
  missedIds,
  ordinal,
  orderCards,
  practiceReducer,
  type Action,
  type SessionState,
} from "./practice";

const run = (state: SessionState, ...actions: Action[]) => actions.reduce(practiceReducer, state);

/** Flips and grades every card in the current round, missing the given ids. */
function gradeRound(state: SessionState, missed: string[] = []): SessionState {
  let s = state;
  for (const id of state.queue) {
    s = run(s, { type: "flip" }, { type: "grade", grade: missed.includes(id) ? "again" : "known" });
  }
  return s;
}

describe("buildSteps", () => {
  it("puts notes before their card and ends with the revise card", () => {
    const steps = buildSteps(largestCountries);
    expect(steps).toHaveLength(10 + 2 + 1);
    expect(steps[2]).toEqual({ type: "note", noteIndex: 0 });
    expect(steps[3]).toEqual({ type: "card", cardIndex: 2 });
    expect(steps[9]).toEqual({ type: "note", noteIndex: 1 });
    expect(steps.at(-1)).toEqual({ type: "revise" });
  });

  it("works for decks without notes", () => {
    expect(buildSteps(helloTenLanguages)).toHaveLength(11);
  });
});

describe("practiceReducer", () => {
  const ids = ["a", "b", "c"];

  it("walks forward and back within bounds", () => {
    let s = run(initSession(3), { type: "begin" }, { type: "startWalkthrough" });
    s = run(s, { type: "prev" });
    expect(s.step).toBe(0);
    s = run(s, { type: "next" }, { type: "next" }, { type: "next" });
    expect(s.step).toBe(2);
    s = run(s, { type: "prev" });
    expect(s.step).toBe(1);
  });

  it("ignores grading until the card is flipped", () => {
    let s = run(initSession(1), { type: "startRevision", order: ids });
    s = run(s, { type: "grade", grade: "known" });
    expect(s.pos).toBe(0);
    s = run(s, { type: "flip" }, { type: "grade", grade: "known" });
    expect(s.pos).toBe(1);
    expect(s.flipped).toBe(false);
  });

  it("repeats revision with only the missed cards until everything is known", () => {
    let s = gradeRound(run(initSession(1), { type: "startRevision", order: ids }), ["b"]);
    expect(s.phase).toBe("roundSummary");
    expect(missedIds(s)).toEqual(["b"]);

    s = gradeRound(run(s, { type: "startRevision", order: missedIds(s) }));
    expect(s.phase).toBe("mastered");
  });

  it("ends a test on the results screen, even with misses", () => {
    const s = gradeRound(run(initSession(1), { type: "startTest", order: ids }), ["a", "c"]);
    expect(s.phase).toBe("results");
    expect(s.queue.filter((id) => s.grades[id] === "known")).toEqual(["b"]);
  });

  it("gives each round a new number so views remount", () => {
    const s = run(initSession(1), { type: "startRevision", order: ids }, { type: "startTest", order: ids });
    expect(s.round).toBe(2);
  });
});

describe("initReviewSession", () => {
  it("starts straight in revision with every card queued, skipping the walkthrough", () => {
    const s = initReviewSession(largestCountries, buildSteps(largestCountries).length);
    expect(s.phase).toBe("revision");
    expect(s.queue).toEqual(largestCountries.cards.map((c) => c.id));
    expect(s.round).toBe(1);
  });

  it("can still be finished like any other revision round", () => {
    const s = gradeRound(initReviewSession(largestCountries, 1));
    expect(s.phase).toBe("mastered");
  });
});

describe("orderCards", () => {
  it("keeps route order for ordered decks", () => {
    expect(orderCards(largestCountries, ["russia", "india", "brazil"])).toEqual(["india", "brazil", "russia"]);
  });

  it("shuffles unordered decks", () => {
    const ids = helloTenLanguages.cards.map((c) => c.id);
    const shuffled = orderCards(helloTenLanguages, ids, () => 0);
    expect(shuffled).not.toEqual(ids);
    expect([...shuffled].sort()).toEqual([...ids].sort());
  });
});

describe("text helpers", () => {
  it("formats ordinals in English and Swedish", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map((n) => ordinal(n, "en"))).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd",
    ]);
    expect([1, 2, 3, 11, 12, 21].map((n) => ordinal(n, "sv"))).toEqual(["1:a", "2:a", "3:e", "11:e", "12:e", "21:a"]);
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fill("Stop {n} of {total}", { n: 3 })).toBe("Stop 3 of {total}");
  });

  it("builds the deck's own test questions", () => {
    const [india, china] = largestCountries.cards;
    expect(deckTestQuestion(largestCountries, india, 1)).toBe("Which is the most populated country in the world?");
    expect(deckTestQuestion(largestCountries, china, 2)).toBe("Which is the 2nd most populated country in the world?");
    expect(deckTestQuestion(helloTenLanguages, helloTenLanguages.cards[0], 1)).toBe('How do you say "hello" in Spanish?');
  });
});
