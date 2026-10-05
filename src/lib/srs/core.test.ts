import { describe, expect, it } from "vitest";
import {
  answerCard,
  applyDeadline,
  buryCard,
  cardKey,
  deadlineFor,
  dayStart,
  DEFAULT_SETTINGS,
  deckCounts,
  formatInterval,
  makeScheduler,
  nextDayStart,
  normalizeSettings,
  presetForDeck,
  DEFAULT_PRESET_ID,
  DEFAULT_PRESET_OPTIONS,
  parseStep,
  parseSteps,
  settingsForDeck,
  pickNext,
  previewDue,
  Rating,
  State,
  type QueueInput,
  type ReviewRecord,
  type StoredCard,
} from "./core";

const units = { m: "m", h: "h", d: "d", mo: "mo", y: "y" };
const scheduler = makeScheduler(settingsForDeck(DEFAULT_SETTINGS, "d"), { fuzz: false });
const at = (iso: string) => new Date(iso);
const minutes = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 60_000);

function queue(partial: Partial<QueueInput> & Pick<QueueInput, "now">): QueueInput {
  return { deckId: "d", cardIds: ["a", "b", "c"], cards: {}, logs: [], settings: DEFAULT_SETTINGS, ...partial };
}

describe("answering cards (new: Again 5m, Hard 10m, Good/Easy by FSRS; relearn 10m)", () => {
  const now = at("2026-10-01T10:00:00");

  it("previews the fixed waits for Again and Hard on a new card", () => {
    const due = previewDue(scheduler, undefined, now);
    expect(minutes(now, due[Rating.Again])).toBe(5);
    expect(minutes(now, due[Rating.Hard])).toBe(10);
  });

  it("lets FSRS schedule Good and Easy straight away, Easy further out", () => {
    const due = previewDue(scheduler, undefined, now);
    expect(minutes(now, due[Rating.Good])).toBeGreaterThanOrEqual(24 * 60);
    expect(due[Rating.Easy].getTime()).toBeGreaterThan(due[Rating.Good].getTime());
    const good = answerCard(scheduler, "d", "a", undefined, Rating.Good, now);
    expect(good.card.state).toBe(State.Review);
    expect(good.record.state).toBe(State.New);
  });

  it("keeps Again and Hard in learning until the card is answered Good", () => {
    const again = answerCard(scheduler, "d", "a", undefined, Rating.Again, now);
    expect(again.card.state).toBe(State.Learning);
    const t1 = new Date(again.card.due);
    const hard = answerCard(scheduler, "d", "a", again.card, Rating.Hard, t1);
    expect(hard.card.state).toBe(State.Learning);
    expect(minutes(t1, new Date(hard.card.due))).toBe(10);
    const t2 = new Date(hard.card.due);
    const good = answerCard(scheduler, "d", "a", hard.card, Rating.Good, t2);
    expect(good.card.state).toBe(State.Review);
    expect(good.card.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it("sends a forgotten review card to relearning", () => {
    const learned = answerCard(scheduler, "d", "a", undefined, Rating.Good, now).card;
    const t = new Date(learned.due);
    const lapse = answerCard(scheduler, "d", "a", learned, Rating.Again, t);
    expect(lapse.card.state).toBe(State.Relearning);
    expect(lapse.card.lapses).toBe(1);
    expect(minutes(t, new Date(lapse.card.due))).toBe(10);
  });

  it("uses the waits of the deck's preset and personal parameters", () => {
    const settings = normalizeSettings({
      presets: [{ id: "exam", name: "Exam", againStep: "2m", hardStep: "20m" }],
      deckOverrides: { d: { presetId: "exam" } },
    });
    const deck = makeScheduler(settingsForDeck(settings, "d"), { fuzz: false });
    const due = previewDue(deck, undefined, now);
    expect(minutes(now, due[Rating.Again])).toBe(2);
    expect(minutes(now, due[Rating.Hard])).toBe(20);
    expect(settingsForDeck(settings, "other").againStep).toBe("5m");

    // Higher initial stability for Good (parameter 2) means a longer first interval.
    const base = previewDue(scheduler, undefined, now)[Rating.Good];
    const parameters = [...scheduler.parameters.w];
    parameters[2] *= 4;
    const personal = makeScheduler({ ...settingsForDeck(DEFAULT_SETTINGS, "d"), parameters }, { fuzz: false });
    expect(previewDue(personal, undefined, now)[Rating.Good].getTime()).toBeGreaterThan(base.getTime());
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

  it("waits for learning cards until they're due, even if nothing else is left", () => {
    const soon = { [cardKey("d", "a")]: stored(State.Learning, "2026-10-01T10:05:00") };
    const due = { [cardKey("d", "a")]: stored(State.Learning, "2026-10-01T09:59:00") };
    const ids = { cardIds: ["a"] };
    expect(pickNext(queue({ now, cards: soon, ...ids }))).toEqual({ kind: "wait", until: at("2026-10-01T10:05:00") });
    expect(pickNext(queue({ now, cards: due, ...ids }))).toEqual({ kind: "card", cardId: "a", queue: "learning" });
  });

  it("brings a card answered Again back only after its wait", () => {
    const again = answerCard(scheduler, "d", "a", undefined, Rating.Again, now).card;
    const cards = { [cardKey("d", "a")]: again };
    const next = pickNext(queue({ now, cards, cardIds: ["a"] }));
    expect(next.kind).toBe("wait");
    expect(pickNext(queue({ now: new Date(now.getTime() + 5 * 60_000), cards, cardIds: ["a"] })).kind).toBe("card");
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

  it("parses single learning waits under a day", () => {
    expect(parseStep("5m")).toBe("5m");
    expect(parseStep(" 2h ")).toBe("2h");
    expect(parseStep("24h")).toBeNull();
    expect(parseStep("1d")).toBeNull();
    expect(parseStep("5m 10m")).toBeNull();
  });

  it("repairs missing or out-of-range values", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    const s = normalizeSettings({ desiredRetention: 2, newPerDay: -5, againStep: "nonsense", enableForNewDecks: false, parameters: [1, 2] });
    expect(s.presets[0].desiredRetention).toBe(0.99);
    expect(s.newPerDay).toBe(0);
    expect(s.presets[0].againStep).toBe(DEFAULT_PRESET_OPTIONS.againStep);
    expect(s.enableForNewDecks).toBe(false);
    expect(s.parameters).toBeNull();
  });

  it("upgrades older settings: top-level options become the default preset, deck options a preset of their own", () => {
    const s = normalizeSettings({ desiredRetention: 0.85, reviewsPerDay: 50, deckOverrides: { a: { newPerDay: 5 }, b: { hardStep: "15m", chapters: true } } });
    expect(s.presets[0]).toMatchObject({ id: DEFAULT_PRESET_ID, desiredRetention: 0.85 });
    expect(s.deckOverrides.a).toEqual({ newPerDay: 5 });
    expect(settingsForDeck(s, "b")).toMatchObject({ hardStep: "15m", desiredRetention: 0.85 });
    expect(settingsForDeck(s, "a").hardStep).toBe("10m");
    expect("reviewsPerDay" in s).toBe(false);
  });

  it("falls back to the default preset when a deck's preset is gone", () => {
    const s = normalizeSettings({ deckOverrides: { a: { presetId: "removed", newPerDay: 3 } } });
    expect(presetForDeck(s, "a").id).toBe(DEFAULT_PRESET_ID);
    expect(settingsForDeck(s, "a").newPerDay).toBe(3);
  });

  it("has no daily review limit", () => {
    const cards = Object.fromEntries(
      Array.from({ length: 300 }, (_, i) => [
        cardKey("d", `c${i}`),
        { due: "2026-10-01T08:00:00", stability: 5, difficulty: 5, elapsedDays: 3, scheduledDays: 3, learningSteps: 0, reps: 2, lapses: 0, state: State.Review, lastReview: null },
      ]),
    );
    const cardIds = Array.from({ length: 300 }, (_, i) => `c${i}`);
    expect(deckCounts(queue({ now: at("2026-10-01T10:00:00"), cards, cardIds })).review).toBe(300);
  });

  it("applies a deck's own daily limit to its queue", () => {
    const settings = normalizeSettings({ deckOverrides: { d: { newPerDay: 1 } } });
    expect(deckCounts(queue({ now: at("2026-10-01T10:00:00"), settings })).new).toBe(1);
  });
});

describe("deadlines and burying", () => {
  const now = at("2026-10-01T10:00:00");

  it("picks the earliest of a deck's exam date and a card's own date", () => {
    expect(deadlineFor(null, undefined)).toBeNull();
    expect(deadlineFor("2026-10-20", "2026-10-10")).toBe("2026-10-10");
    expect(deadlineFor("2026-10-05", "bad")).toBe("2026-10-05");
  });

  it("pulls a review forward to the day before the deadline", () => {
    const card = answerCard(scheduler, "d", "a", undefined, Rating.Easy, now).card;
    expect(new Date(card.due).getTime()).toBeGreaterThan(at("2026-10-04T10:00:00").getTime());
    const capped = applyDeadline(card, "2026-10-04", now);
    expect(new Date(capped.due).getTime()).toBe(at("2026-10-03T04:00:00").getTime());
    expect(applyDeadline(card, "2030-01-01", now)).toBe(card); // already due before a far deadline
    expect(applyDeadline(card, "2026-10-01", now)).toBe(card); // the deadline has passed
  });

  it("previews the capped interval on the answer buttons", () => {
    const due = previewDue(scheduler, undefined, now, "2026-10-03");
    expect(due[Rating.Easy].getTime()).toBe(at("2026-10-02T04:00:00").getTime());
    expect(minutes(now, due[Rating.Again])).toBe(5); // short learning steps are untouched
  });

  it("buries a new card until tomorrow, out of today's queue", () => {
    const buried = buryCard(undefined, now);
    expect(new Date(buried.due).getTime()).toBe(at("2026-10-02T04:00:00").getTime());
    const cards = { [cardKey("d", "a")]: buried };
    expect(deckCounts(queue({ now, cards })).new).toBe(2);
    expect(deckCounts(queue({ now: at("2026-10-02T09:00:00"), cards })).new).toBe(3);
  });

  it("buries a due review card until tomorrow", () => {
    const learned = answerCard(scheduler, "d", "a", undefined, Rating.Good, now).card;
    const t = new Date(learned.due);
    const buried = buryCard(learned, t);
    expect(buried.state).toBe(State.Review);
    expect(new Date(buried.due).getTime()).toBeGreaterThan(t.getTime());
  });
});
