import { bestStreak, countByDay, type TestResult } from "./activity";
import { State, type StoredCard } from "./srs/core";

// Statistics and achievements on the account page, from the learner's whole review history. Pure (no
// React, no network) so it can be tested; lib/accountActivity.ts fetches the data.

/** One answered card, as much of the review log as the statistics need. */
export interface ReviewEntry {
  deckId: string;
  cardId: string;
  /** 1 Again, 2 Hard, 3 Good, 4 Easy. */
  rating: number;
  /** The card's state before the answer (0 new, 1 learning, 2 review, 3 relearning). */
  state: number;
  review: string;
}

/** A card counts as "mature" (in long-term memory) from this interval on, as in most SRS apps. */
export const MATURE_DAYS = 21;

export interface StudyStats {
  totalReviews: number;
  cardsStudied: number;
  /** Share of due reviews answered without "Again", all time and the last 30 days; null without data. */
  retention: number | null;
  retention30: number | null;
  reviews30: number;
  activeDays: number;
  matureCards: number;
  testsTaken: number;
  perfectTests: number;
  /** Average test score as a share of the maximum; null without tests. */
  averageTest: number | null;
  bestStreak: number;
}

const share = (good: number, all: number) => (all === 0 ? null : good / all);

export function computeStats(reviews: ReviewEntry[], cards: Record<string, StoredCard>, tests: TestResult[], testCount: number, now: Date): StudyStats {
  const since30 = now.getTime() - 30 * 86_400_000;
  let due = 0;
  let recalled = 0;
  let due30 = 0;
  let recalled30 = 0;
  let reviews30 = 0;
  for (const r of reviews) {
    const recent = new Date(r.review).getTime() >= since30;
    if (recent) reviews30++;
    // Retention is measured on cards that were due for review, not on cards still being learned.
    if (r.state !== State.Review) continue;
    due++;
    if (r.rating > 1) recalled++;
    if (recent) {
      due30++;
      if (r.rating > 1) recalled30++;
    }
  }
  const days = countByDay([...reviews.map((r) => r.review), ...tests.map((t) => t.at)]);
  return {
    totalReviews: reviews.length,
    cardsStudied: new Set(reviews.map((r) => `${r.deckId}::${r.cardId}`)).size,
    retention: share(recalled, due),
    retention30: share(recalled30, due30),
    reviews30,
    activeDays: days.size,
    matureCards: Object.values(cards).filter((c) => c.state === State.Review && c.scheduledDays >= MATURE_DAYS).length,
    testsTaken: testCount,
    perfectTests: tests.filter((t) => t.total > 0 && t.score === t.total).length,
    averageTest: tests.length ? tests.reduce((n, t) => n + (t.total ? t.score / t.total : 0), 0) / tests.length : null,
    bestStreak: bestStreak(days),
  };
}

export type AchievementId =
  | "firstReview"
  | "reviews100"
  | "reviews500"
  | "reviews1000"
  | "reviews5000"
  | "reviews10000"
  | "cards50"
  | "cards500"
  | "streak3"
  | "streak7"
  | "streak30"
  | "streak100"
  | "mature10"
  | "mature50"
  | "mature250"
  | "retention90"
  | "perfectTest"
  | "tests10"
  | "firstDeck"
  | "deckBuilder"
  | "nightOwl"
  | "earlyBird";

export interface Achievement {
  id: AchievementId;
  /** Progress towards the goal, capped at the goal. */
  progress: number;
  goal: number;
  done: boolean;
}

/** Hours (local time) that count as a late study session for "Night owl". */
const isLate = (iso: string) => {
  const h = new Date(iso).getHours();
  return h >= 23 || h < 4;
};

/** Hours (local time) for "Early bird". */
const isEarly = (iso: string) => {
  const h = new Date(iso).getHours();
  return h >= 5 && h < 7;
};

export function achievements(stats: StudyStats, reviews: ReviewEntry[], ownDecks: number): Achievement[] {
  // Retention only counts once there are enough due reviews for the share to mean something.
  const steadyRetention = stats.retention !== null && stats.retention >= 0.9 && reviews.filter((r) => r.state === State.Review).length >= 100 ? 1 : 0;
  const goals: [AchievementId, number, number][] = [
    ["firstReview", stats.totalReviews, 1],
    ["reviews100", stats.totalReviews, 100],
    ["reviews500", stats.totalReviews, 500],
    ["reviews1000", stats.totalReviews, 1000],
    ["reviews5000", stats.totalReviews, 5000],
    ["reviews10000", stats.totalReviews, 10000],
    ["cards50", stats.cardsStudied, 50],
    ["cards500", stats.cardsStudied, 500],
    ["streak3", stats.bestStreak, 3],
    ["streak7", stats.bestStreak, 7],
    ["streak30", stats.bestStreak, 30],
    ["streak100", stats.bestStreak, 100],
    ["mature10", stats.matureCards, 10],
    ["mature50", stats.matureCards, 50],
    ["mature250", stats.matureCards, 250],
    ["retention90", steadyRetention, 1],
    ["perfectTest", stats.perfectTests, 1],
    ["tests10", stats.testsTaken, 10],
    ["firstDeck", ownDecks, 1],
    ["deckBuilder", ownDecks, 5],
    ["nightOwl", reviews.filter((r) => isLate(r.review)).length, 25],
    ["earlyBird", reviews.filter((r) => isEarly(r.review)).length, 25],
  ];
  return goals.map(([id, value, goal]) => ({ id, progress: Math.min(value, goal), goal, done: value >= goal }));
}
