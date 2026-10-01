import { describe, expect, it } from "vitest";
import {
  answerCard,
  cardKey,
  dayStart,
  DEFAULT_SETTINGS,
  deckCounts,
  formatInterval,
  makeScheduler,
  nextDayStart,
  normalizeSettings,
  parseSteps,
  pickNext,
  previewDue,
  Rating,
  State,
  type Grade,
  type QueueInput,
  type ReviewRecord,
  type StoredCard,
} from "./core";

const units = { m: "m", h: "h", d: "d", mo: "mo", y: "y" };
const scheduler = makeScheduler(DEFAULT_SETTINGS, { fuzz: false });
const at = (iso: string) => new Date(iso);
const minutes = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 60_000);

function queue(partial: Partial<QueueInput> & Pick<QueueInput, "now">): QueueInput {
  return { deckId: "d", cardIds: ["a", "b", "c"], cards: {}, logs: [], settings: DEFAULT_SETTINGS, ...partial };
}

describe("answering cards (Anki defaults: steps 1m 10m, relearn 10m)", () => {
  const now = at("2026-10-01T10:00:00");

  it("previews Anki's intervals for a new card", () => {
    const due = previewDue(scheduler, undefined, now);
    expect(minutes(now, due[Rating.Again])).toBe(1);
    expect(minutes(now, due[Rating.Hard])).toBe(6);
    expect(minutes(now, due[Rating.Good])).toBe(10);
    expect(minutes(now, due[Rating.Easy])).toBeGreaterThan(24 * 60);
  });

  it("moves a new card through learning into review", () => {
    const first = answerCard(scheduler, "d", "a", undefined, Rating.Good, now);
    expect(first.card.state).toBe(State.Learning);
    expect(first.record.state).toBe(State.New);

    const later = new Date(first.card.due);
    const second = answerCard(scheduler, "d", "a", first.card, Rating.Good, later);
    expect(second.card.state).toBe(State.Review);
    expect(second.card.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it("sends a forgotten review card to relearning", () => {
    let card: StoredCard | undefined;
    let t = now;
    const grades: Grade[] = [Rating.Good, Rating.Good];
    for (const g of grades) {
      card = answerCard(scheduler, "d", "a", card, g, t).card;
      t = new Date(card.due);
    }
    const lapse = answerCard(scheduler, "d", "a", card, Rating.Again, t);
    expect(lapse.card.state).toBe(State.Relearning);
    expect(lapse.card.lapses).toBe(1);
    expect(minutes(t, new Date(lapse.card.due))).toBe(10);
  });
});

describe("queue", () => {
  const now = at("2026-10-01T10:00:00");
  const stored = (state: State, due: string): StoredCard => ({
    due: at(due).toISOString(),
    stability: 3,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 1,
    learningSteps: 0,
    reps: 1,
    lapses: 0,
    state,
    lastReview: null,
  });

  it("shows due learning cards first, then reviews, then new cards in deck order", () => {
    const cards = {
      [cardKey("d", "b")]: stored(State.Review, "2026-10-01T08:00:00"),
      [cardKey("d", "c")]: stored(State.Learning, "2026-10-01T09:59:00"),
    };
    expect(pickNext(queue({ now, cards }))).toEqual({ kind: "card", cardId: "c", queue: "learning" });

    const noLearning = { [cardKey("d", "b")]: cards[cardKey("d", "b")] };
    expect(pickNext(queue({ now, cards: noLearning }))).toEqual({ kind: "card", cardId: "b", queue: "review" });
    expect(pickNext(queue({ now }))).toEqual({ kind: "card", cardId: "a", queue: "new" });
  });

  it("waits for learning cards that aren't due yet, and shows them early within 20 minutes", () => {
    const later = { [cardKey("d", "a")]: stored(State.Learning, "2026-10-01T11:00:00") };
    const soon = { [cardKey("d", "a")]: stored(State.Learning, "2026-10-01T10:15:00") };
    const ids = { cardIds: ["a"] };
    expect(pickNext(queue({ now, cards: later, ...ids }))).toEqual({ kind: "wait", until: at("2026-10-01T11:00:00") });
    expect(pickNext(queue({ now, cards: soon, ...ids }))).toEqual({ kind: "card", cardId: "a", queue: "learning" });
  });

  it("ignores reviews due after today and reports done", () => {
    const cards = { [cardKey("d", "a")]: stored(State.Review, "2026-10-03T10:00:00") };
    expect(pickNext(queue({ now, cards, cardIds: ["a"] }))).toEqual({ kind: "done" });
  });

  it("applies the daily new card limit, counting cards already introduced today", () => {
    const settings = { ...DEFAULT_SETTINGS, newPerDay: 2 };
    const log = (cardId: string, review: string): ReviewRecord => ({
      deckId: "d", cardId, rating: Rating.Good, state: State.New, review: at(review).toISOString(), due: "",
      stability: 0, difficulty: 0, elapsedDays: 0, lastElapsedDays: 0, scheduledDays: 0, learningSteps: 0,
    });
    expect(deckCounts(queue({ now, settings })).new).toBe(2);
    expect(deckCounts(queue({ now, settings, logs: [log("x", "2026-10-01T09:00:00")] })).new).toBe(1);
    // Yesterday's (before the 4 am rollover) doesn't count against today.
    expect(deckCounts(queue({ now, settings, logs: [log("x", "2026-10-01T03:00:00")] })).new).toBe(2);
  });
});

describe("days and labels", () => {
  it("starts a new day at 4 am", () => {
    expect(dayStart(at("2026-10-01T03:59:00"))).toEqual(at("2026-09-30T04:00:00"));
    expect(dayStart(at("2026-10-01T04:00:00"))).toEqual(at("2026-10-01T04:00:00"));
    expect(nextDayStart(at("2026-10-01T23:00:00"))).toEqual(at("2026-10-02T04:00:00"));
  });

  it("formats intervals like Anki's buttons", () => {
    const min = 60_000;
    const day = 24 * 60 * min;
    expect([0.5 * min, 6 * min, 3 * 60 * min, 4 * day, 46 * day, 800 * day].map((ms) => formatInterval(ms, units))).toEqual([
      "<1m", "6m", "3h", "4d", "1.5mo", "2.2y",
    ]);
  });
});

describe("settings", () => {
  it("parses learning steps and rejects invalid ones", () => {
    expect(parseSteps("1m 10m")).toEqual(["1m", "10m"]);
    expect(parseSteps("15m, 1h, 1d")).toEqual(["15m", "1h", "1d"]);
    expect(parseSteps("")).toEqual([]);
    expect(parseSteps("10 minutes")).toBeNull();
    expect(parseSteps("0m")).toBeNull();
  });

  it("repairs missing or out-of-range values", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    const s = normalizeSettings({ desiredRetention: 2, newPerDay: -5, learningSteps: "nonsense", enableForNewDecks: false });
    expect(s.desiredRetention).toBe(0.99);
    expect(s.newPerDay).toBe(0);
    expect(s.learningSteps).toBe(DEFAULT_SETTINGS.learningSteps);
    expect(s.enableForNewDecks).toBe(false);
  });
});
