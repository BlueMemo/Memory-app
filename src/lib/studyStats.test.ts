import { describe, expect, it } from "vitest";
import { State } from "./srs/core";
import { achievements, computeStats, type ReviewEntry } from "./studyStats";

const review = (cardId: string, rating: number, state: number, iso: string): ReviewEntry => ({ deckId: "d", cardId, rating, state, review: iso });

describe("study statistics", () => {
  const now = new Date("2026-10-05T12:00:00");
  const reviews = [
    review("a", 3, State.New, "2026-09-01T10:00:00"),
    review("a", 1, State.Review, "2026-09-03T10:00:00"),
    review("b", 3, State.New, "2026-10-01T10:00:00"),
    review("b", 4, State.Review, "2026-10-03T23:30:00"),
    review("a", 3, State.Review, "2026-10-04T10:00:00"),
  ];
  const stats = computeStats(reviews, {}, [{ deckId: "d", score: 10, total: 10, at: "2026-10-02T10:00:00" }], 1, now);

  it("counts reviews, cards and days", () => {
    expect(stats.totalReviews).toBe(5);
    expect(stats.cardsStudied).toBe(2);
    expect(stats.reviews30).toBe(3);
  });

  it("measures retention on due reviews only", () => {
    expect(stats.retention).toBeCloseTo(2 / 3);
    expect(stats.retention30).toBe(1);
  });

  it("tracks tests", () => {
    expect(stats.perfectTests).toBe(1);
    expect(stats.averageTest).toBe(1);
  });

  it("unlocks achievements with progress", () => {
    const list = achievements(stats, reviews, 2);
    expect(list.find((a) => a.id === "firstReview")?.done).toBe(true);
    expect(list.find((a) => a.id === "perfectTest")?.done).toBe(true);
    expect(list.find((a) => a.id === "reviews100")).toMatchObject({ done: false, progress: 5, goal: 100 });
    expect(list.find((a) => a.id === "nightOwl")?.progress).toBe(1);
  });

  it("has no retention without due reviews", () => {
    expect(computeStats([], {}, [], 0, now).retention).toBeNull();
  });
});
