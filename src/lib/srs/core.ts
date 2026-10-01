import {
  createEmptyCard,
  fsrs,
  default_learning_steps,
  default_relearning_steps,
  Rating,
  State,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
  type ReviewLog,
  type StepUnit,
} from "ts-fsrs";

// Spaced repetition with FSRS, the scheduler Anki uses. This file is pure (no storage, no React) so the
// scheduling rules can be unit-tested; `store.ts` keeps the data and `ReviewSession` shows the cards.

export { Rating, State };
export type { Grade };

/** Anki starts a new day at 4 am rather than midnight, so a late-night session still counts as "today". */
export const DAY_ROLLOVER_HOUR = 4;
/** Like Anki's "learn ahead limit": learning cards due this soon may be shown early when nothing else is left. */
export const LEARN_AHEAD_MS = 20 * 60_000;

/** The scheduling state of one card. Dates are ISO strings so the record stores cleanly as JSON or a DB row. */
export interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview: string | null;
}

/** One answered card, like a row in Anki's review log. `state` is the card's state before this review. */
export interface ReviewRecord {
  deckId: string;
  cardId: string;
  rating: Grade;
  state: State;
  review: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
}

/** One set of options for all decks (Anki calls this a deck options preset). */
export interface SrsSettings {
  /** Whether spaced repetition is switched on for decks created from now on. */
  enableForNewDecks: boolean;
  /** The probability of recalling a card when it comes due. Higher means more reviews. */
  desiredRetention: number;
  newPerDay: number;
  reviewsPerDay: number;
  /** Space-separated steps such as "1m 10m". Units: m, h, d. */
  learningSteps: string;
  relearningSteps: string;
  /** Longest interval in days. */
  maximumInterval: number;
}

export const DEFAULT_SETTINGS: SrsSettings = {
  enableForNewDecks: true,
  desiredRetention: 0.9,
  newPerDay: 20,
  reviewsPerDay: 200,
  learningSteps: default_learning_steps.join(" "),
  relearningSteps: default_relearning_steps.join(" "),
  maximumInterval: 36500,
};

export const SETTINGS_LIMITS = {
  desiredRetention: { min: 0.7, max: 0.99 },
  newPerDay: { min: 0, max: 9999 },
  reviewsPerDay: { min: 0, max: 9999 },
  maximumInterval: { min: 1, max: 36500 },
} as const;

/** Fills in missing or out-of-range values, e.g. from older saved settings. */
export function normalizeSettings(raw: unknown): SrsSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof SrsSettings, unknown>>;
  const num = (v: unknown, key: keyof typeof SETTINGS_LIMITS) => {
    const { min, max } = SETTINGS_LIMITS[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : DEFAULT_SETTINGS[key];
  };
  const steps = (v: unknown, fallback: string) => (typeof v === "string" && parseSteps(v) ? v.trim() : fallback);
  return {
    enableForNewDecks: typeof s.enableForNewDecks === "boolean" ? s.enableForNewDecks : DEFAULT_SETTINGS.enableForNewDecks,
    desiredRetention: num(s.desiredRetention, "desiredRetention"),
    newPerDay: Math.round(num(s.newPerDay, "newPerDay")),
    reviewsPerDay: Math.round(num(s.reviewsPerDay, "reviewsPerDay")),
    learningSteps: steps(s.learningSteps, DEFAULT_SETTINGS.learningSteps),
    relearningSteps: steps(s.relearningSteps, DEFAULT_SETTINGS.relearningSteps),
    maximumInterval: Math.round(num(s.maximumInterval, "maximumInterval")),
  };
}

/** Parses "1m 10m" (spaces or commas) into steps; returns null if any part is invalid. Empty text means no steps. */
export function parseSteps(text: string): StepUnit[] | null {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  const steps: StepUnit[] = [];
  for (const part of parts) {
    const m = /^(\d+(?:\.\d+)?)([mhd])$/.exec(part);
    if (!m || Number(m[1]) <= 0) return null;
    steps.push(`${Number(m[1])}${m[2]}` as StepUnit);
  }
  return steps;
}

export function makeScheduler(settings: SrsSettings, { fuzz = true }: { fuzz?: boolean } = {}): FSRS {
  return fsrs({
    request_retention: settings.desiredRetention,
    maximum_interval: settings.maximumInterval,
    // Like Anki, spread intervals out slightly so cards learned together don't stay bunched up forever.
    enable_fuzz: fuzz,
    enable_short_term: true,
    learning_steps: parseSteps(settings.learningSteps) ?? default_learning_steps,
    relearning_steps: parseSteps(settings.relearningSteps) ?? default_relearning_steps,
  });
}

export function toFsrsCard(stored: StoredCard | undefined, now: Date): FsrsCard {
  if (!stored) return createEmptyCard(now);
  return {
    due: new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsedDays,
    scheduled_days: stored.scheduledDays,
    learning_steps: stored.learningSteps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: stored.lastReview ? new Date(stored.lastReview) : undefined,
  };
}

export function fromFsrsCard(card: FsrsCard): StoredCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function toReviewRecord(deckId: string, cardId: string, log: ReviewLog): ReviewRecord {
  return {
    deckId,
    cardId,
    rating: log.rating as Grade,
    state: log.state,
    review: log.review.toISOString(),
    due: log.due.toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    elapsedDays: log.elapsed_days,
    lastElapsedDays: log.last_elapsed_days,
    scheduledDays: log.scheduled_days,
    learningSteps: log.learning_steps,
  };
}

/** Answers a card: returns its new scheduling state and the review log entry. */
export function answerCard(
  scheduler: FSRS,
  deckId: string,
  cardId: string,
  stored: StoredCard | undefined,
  grade: Grade,
  now: Date,
): { card: StoredCard; record: ReviewRecord } {
  const { card, log } = scheduler.next(toFsrsCard(stored, now), now, grade);
  return { card: fromFsrsCard(card), record: toReviewRecord(deckId, cardId, log) };
}

/** When each answer button would schedule the card next, for the labels above the buttons. */
export function previewDue(scheduler: FSRS, stored: StoredCard | undefined, now: Date): Record<Grade, Date> {
  const preview = scheduler.repeat(toFsrsCard(stored, now), now);
  return {
    [Rating.Again]: preview[Rating.Again].card.due,
    [Rating.Hard]: preview[Rating.Hard].card.due,
    [Rating.Good]: preview[Rating.Good].card.due,
    [Rating.Easy]: preview[Rating.Easy].card.due,
  } as Record<Grade, Date>;
}

export function dayStart(now: Date, rolloverHour = DAY_ROLLOVER_HOUR): Date {
  const start = new Date(now);
  start.setHours(rolloverHour, 0, 0, 0);
  if (now < start) start.setDate(start.getDate() - 1);
  return start;
}

export function nextDayStart(now: Date, rolloverHour = DAY_ROLLOVER_HOUR): Date {
  const next = dayStart(now, rolloverHour);
  next.setDate(next.getDate() + 1);
  return next;
}

export const cardKey = (deckId: string, cardId: string) => `${deckId}::${cardId}`;

const isLearning = (s: StoredCard) => s.state === State.Learning || s.state === State.Relearning;

export interface QueueInput {
  deckId: string;
  /** The deck's card ids, in deck order (new cards are introduced in this order). */
  cardIds: string[];
  cards: Record<string, StoredCard>;
  logs: ReviewRecord[];
  settings: SrsSettings;
  now: Date;
}

export interface DeckCounts {
  /** New cards that can still be introduced today. */
  new: number;
  /** Cards in (re)learning that come due before the day ends. */
  learning: number;
  /** Review cards due today, within today's review limit. */
  review: number;
}

/** How many new cards and reviews were already answered in this deck today, for the daily limits. */
export function doneToday(input: Pick<QueueInput, "deckId" | "logs" | "now">) {
  const since = dayStart(input.now).getTime();
  let newDone = 0;
  let reviewsDone = 0;
  for (const log of input.logs) {
    if (log.deckId !== input.deckId || new Date(log.review).getTime() < since) continue;
    if (log.state === State.New) newDone++;
    else if (log.state === State.Review) reviewsDone++;
  }
  return { newDone, reviewsDone };
}

function classify(input: QueueInput) {
  const endOfDay = nextDayStart(input.now).getTime();
  const fresh: string[] = [];
  const learning: { id: string; due: number }[] = [];
  const review: { id: string; due: number }[] = [];
  for (const id of input.cardIds) {
    const s = input.cards[cardKey(input.deckId, id)];
    if (!s || s.state === State.New) {
      fresh.push(id);
      continue;
    }
    const due = new Date(s.due).getTime();
    if (due >= endOfDay) continue;
    (isLearning(s) ? learning : review).push({ id, due });
  }
  learning.sort((a, b) => a.due - b.due);
  review.sort((a, b) => a.due - b.due);
  const { newDone, reviewsDone } = doneToday(input);
  return {
    fresh: fresh.slice(0, Math.max(0, input.settings.newPerDay - newDone)),
    learning,
    review: review.slice(0, Math.max(0, input.settings.reviewsPerDay - reviewsDone)),
  };
}

export function deckCounts(input: QueueInput): DeckCounts {
  const { fresh, learning, review } = classify(input);
  return { new: fresh.length, learning: learning.length, review: review.length };
}

export type NextCard =
  | { kind: "card"; cardId: string; queue: "learning" | "review" | "new" }
  /** Only learning cards remain, and the next one isn't due yet. */
  | { kind: "wait"; until: Date }
  | { kind: "done" };

/**
 * Picks the next card the way Anki does: learning cards that are due come first, then reviews due today,
 * then new cards (shown after reviews), then learning cards within the learn-ahead limit.
 */
export function pickNext(input: QueueInput): NextCard {
  const { fresh, learning, review } = classify(input);
  const now = input.now.getTime();
  const dueLearning = learning.find((c) => c.due <= now);
  if (dueLearning) return { kind: "card", cardId: dueLearning.id, queue: "learning" };
  if (review.length) return { kind: "card", cardId: review[0].id, queue: "review" };
  if (fresh.length) return { kind: "card", cardId: fresh[0], queue: "new" };
  if (learning.length) {
    const soonest = learning[0];
    if (soonest.due <= now + LEARN_AHEAD_MS) return { kind: "card", cardId: soonest.id, queue: "learning" };
    return { kind: "wait", until: new Date(soonest.due) };
  }
  return { kind: "done" };
}

export interface IntervalUnits {
  m: string;
  h: string;
  d: string;
  mo: string;
  y: string;
}

/** Formats a span the way Anki labels its answer buttons: "<1m", "10m", "3h", "4d", "1.5mo", "2.1y". */
export function formatInterval(ms: number, u: IntervalUnits): string {
  const minutes = ms / 60_000;
  if (minutes < 1) return `<1${u.m}`;
  if (minutes < 60) return `${Math.round(minutes)}${u.m}`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}${u.h}`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}${u.d}`;
  const months = days / 30.4;
  if (months < 12) return `${trim(months)}${u.mo}`;
  return `${trim(days / 365)}${u.y}`;
}

const trim = (n: number) => (n < 10 ? n.toFixed(1).replace(/\.0$/, "") : String(Math.round(n)));
