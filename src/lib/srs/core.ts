import {
  BasicLearningStepsStrategy,
  createEmptyCard,
  default_relearning_steps,
  default_w,
  fsrs,
  Rating,
  State,
  StrategyMode,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
  type ReviewLog,
  type StepUnit,
} from "ts-fsrs";

type LearningStepsStrategy = typeof BasicLearningStepsStrategy;

// Spaced repetition with FSRS, the scheduler Anki uses. This file is pure (no storage, no React) so the
// scheduling rules can be unit-tested; `store.ts` keeps the data and `ReviewSession` shows the cards.

export { Rating, State };
export type { Grade };

/** Anki starts a new day at 4 am rather than midnight, so a late-night session still counts as "today". */
export const DAY_ROLLOVER_HOUR = 4;
/**
 * How early a learning card may be shown when nothing else is left (Anki's "learn ahead limit"). Zero:
 * a card answered Again or Hard comes back when its wait (e.g. 5m) is over, as its button promised, and
 * the session shows a countdown until then.
 */
export const LEARN_AHEAD_MS = 0;

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

/** The FSRS options a named preset holds; decks pick a preset (like option presets in other SRS apps). */
export interface PresetOptions {
  /** The probability of recalling a card when it comes due. Higher means more reviews. */
  desiredRetention: number;
  /** A new card answered Again comes back after this long, e.g. "5m". Units: m, h. */
  againStep: string;
  /** A new card answered Hard comes back after this long, e.g. "10m". Good and Easy go straight to FSRS. */
  hardStep: string;
  /** Space-separated waits for a learned card you forgot (a lapse), e.g. "10m". Units: m, h, d. */
  relearningSteps: string;
  /** Longest interval in days. */
  maximumInterval: number;
}

export interface Preset extends PresetOptions {
  id: string;
  name: string;
}

/** What each deck sets for itself: its preset, how many new cards a day, and an optional exam date. */
export interface DeckSettings {
  presetId: string;
  newPerDay: number;
  /** "YYYY-MM-DD": reviews are pulled forward so every card is due again before this day (e.g. a test). */
  examDate: string | null;
}

/** All spaced-repetition settings: presets, per-deck settings, and the personal FSRS model. */
export interface SrsSettings {
  /** Whether spaced repetition is switched on for decks created from now on. */
  enableForNewDecks: boolean;
  /** Named presets; the first ("default") is used by every deck that hasn't picked another, and can't be removed. */
  presets: Preset[];
  /** New cards a day for decks that haven't set their own. */
  newPerDay: number;
  /** What each deck has set for itself, by deck id. */
  deckOverrides: Record<string, Partial<DeckSettings>>;
  /** FSRS model parameters optimised on this learner's history; null means the standard ones. */
  parameters: number[] | null;
  /** When the parameters were last optimised (ISO), and how many reviews that was based on. */
  optimizedAt: string | null;
  optimizedReviewCount: number;
  /** Re-optimise in the background as new reviews come in (see lib/srs/optimize.ts). */
  autoOptimize: boolean;
  /** How often each celebration (lib/celebrations.ts) has been shown, by id, for the achievements. */
  celebrations: Record<string, number>;
}

/** Everything that applies to one deck, flattened: its preset's options, its own settings and the FSRS model. */
export interface EffectiveSettings extends PresetOptions, Omit<DeckSettings, "presetId"> {
  presetId: string;
  parameters: number[] | null;
}

export const DEFAULT_PRESET_ID = "default";

export const DEFAULT_PRESET_OPTIONS: PresetOptions = {
  desiredRetention: 0.9,
  againStep: "5m",
  hardStep: "10m",
  relearningSteps: default_relearning_steps.join(" "),
  maximumInterval: 36500,
};

export const DEFAULT_SETTINGS: SrsSettings = {
  enableForNewDecks: true,
  presets: [{ id: DEFAULT_PRESET_ID, name: "", ...DEFAULT_PRESET_OPTIONS }],
  newPerDay: 20,
  deckOverrides: {},
  parameters: null,
  optimizedAt: null,
  optimizedReviewCount: 0,
  autoOptimize: true,
  celebrations: {},
};

export const PRESET_OPTION_KEYS = ["desiredRetention", "againStep", "hardStep", "relearningSteps", "maximumInterval"] as const satisfies readonly (keyof PresetOptions)[];

export const SETTINGS_LIMITS = {
  desiredRetention: { min: 0.7, max: 0.99 },
  newPerDay: { min: 0, max: 9999 },
  maximumInterval: { min: 1, max: 36500 },
} as const;

/** The preset a deck uses (the default one if it hasn't picked another, or its pick was removed). */
export function presetForDeck(settings: SrsSettings, deckId: string): Preset {
  const id = settings.deckOverrides[deckId]?.presetId;
  return settings.presets.find((p) => p.id === id) ?? settings.presets[0];
}

/** The settings that apply to one deck. */
export function settingsForDeck(settings: SrsSettings, deckId: string): EffectiveSettings {
  const own = settings.deckOverrides[deckId] ?? {};
  const preset = presetForDeck(settings, deckId);
  const options = Object.fromEntries(PRESET_OPTION_KEYS.map((k) => [k, preset[k]])) as unknown as PresetOptions;
  return {
    ...options,
    presetId: preset.id,
    newPerDay: own.newPerDay ?? settings.newPerDay,
    examDate: own.examDate ?? null,
    parameters: settings.parameters,
  };
}

const isDateString = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

const clampNumber = (v: unknown, key: keyof typeof SETTINGS_LIMITS, fallback: number) => {
  const { min, max } = SETTINGS_LIMITS[key];
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

export function normalizePresetOptions(raw: unknown, fallback: PresetOptions = DEFAULT_PRESET_OPTIONS): PresetOptions {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof PresetOptions, unknown>>;
  const steps = (v: unknown, fb: string) => (typeof v === "string" && parseSteps(v) ? v.trim() : fb);
  const step = (v: unknown, fb: string) => (typeof v === "string" && parseStep(v) !== null ? v.trim() : fb);
  return {
    desiredRetention: clampNumber(s.desiredRetention, "desiredRetention", fallback.desiredRetention),
    againStep: step(s.againStep, fallback.againStep),
    hardStep: step(s.hardStep, fallback.hardStep),
    relearningSteps: steps(s.relearningSteps, fallback.relearningSteps),
    maximumInterval: Math.round(clampNumber(s.maximumInterval, "maximumInterval", fallback.maximumInterval)),
  };
}

const isParameters = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === default_w.length && v.every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * Fills in missing or out-of-range values. Also upgrades older saved settings: top-level FSRS options
 * become the default preset, and a deck that had its own FSRS options gets a preset of its own.
 */
export function normalizeSettings(raw: unknown): SrsSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const presets: Preset[] = [];
  if (Array.isArray(s.presets)) {
    for (const p of s.presets as Record<string, unknown>[]) {
      if (!p || typeof p.id !== "string" || presets.some((x) => x.id === p.id)) continue;
      presets.push({ id: p.id, name: typeof p.name === "string" ? p.name.slice(0, 60) : "", ...normalizePresetOptions(p) });
    }
  }
  // The default preset always exists and comes first (older settings kept its options at the top level).
  const defaultIndex = presets.findIndex((p) => p.id === DEFAULT_PRESET_ID);
  const fallbackDefault: Preset = { id: DEFAULT_PRESET_ID, name: "", ...normalizePresetOptions(s) };
  const defaultPreset = defaultIndex >= 0 ? presets.splice(defaultIndex, 1)[0] : fallbackDefault;
  presets.unshift(defaultPreset);

  const newPerDay = Math.round(clampNumber(s.newPerDay, "newPerDay", DEFAULT_SETTINGS.newPerDay));
  const overrides: Record<string, Partial<DeckSettings>> = {};
  if (s.deckOverrides && typeof s.deckOverrides === "object") {
    let custom = 0;
    for (const [deckId, value] of Object.entries(s.deckOverrides as Record<string, Record<string, unknown>>)) {
      if (!value || typeof value !== "object") continue;
      const own: Partial<DeckSettings> = {};
      if (typeof value.presetId === "string" && presets.some((p) => p.id === value.presetId)) own.presetId = value.presetId;
      else if (PRESET_OPTION_KEYS.some((k) => value[k] !== undefined)) {
        // An older per-deck customisation: keep it as a preset of its own.
        const id = `deck-${deckId}`;
        if (!presets.some((p) => p.id === id)) {
          custom++;
          presets.push({ id, name: `#${custom}`, ...normalizePresetOptions(value, defaultPreset) });
        }
        own.presetId = id;
      }
      if (typeof value.newPerDay === "number") own.newPerDay = Math.round(clampNumber(value.newPerDay, "newPerDay", newPerDay));
      if (isDateString(value.examDate)) own.examDate = value.examDate;
      if (own.presetId === DEFAULT_PRESET_ID) delete own.presetId;
      if (Object.keys(own).length) overrides[deckId] = own;
    }
  }
  return {
    enableForNewDecks: typeof s.enableForNewDecks === "boolean" ? s.enableForNewDecks : DEFAULT_SETTINGS.enableForNewDecks,
    presets,
    newPerDay,
    deckOverrides: overrides,
    parameters: isParameters(s.parameters) ? s.parameters : null,
    optimizedAt: typeof s.optimizedAt === "string" ? s.optimizedAt : null,
    optimizedReviewCount:
      typeof s.optimizedReviewCount === "number" && s.optimizedReviewCount >= 0 ? Math.round(s.optimizedReviewCount) : 0,
    autoOptimize: typeof s.autoOptimize === "boolean" ? s.autoOptimize : DEFAULT_SETTINGS.autoOptimize,
    celebrations: normalizeCounts(s.celebrations),
  };
}

/** Whole, non-negative counts by short id; anything else is dropped. */
function normalizeCounts(raw: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return counts;
  for (const [id, n] of Object.entries(raw as Record<string, unknown>).slice(0, 50)) {
    if (id.length <= 40 && typeof n === "number" && Number.isFinite(n) && n > 0) counts[id] = Math.floor(n);
  }
  return counts;
}

/** Parses one wait such as "5m" or "1h" (minutes or hours; a learning step stays within the day). */
export function parseStep(text: string): StepUnit | null {
  const m = /^(\d+(?:\.\d+)?)([mh])$/.exec(text.trim());
  if (!m || Number(m[1]) <= 0) return null;
  const minutes = m[2] === "h" ? Number(m[1]) * 60 : Number(m[1]);
  return minutes < 1440 ? (`${Number(m[1])}${m[2]}` as StepUnit) : null;
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

const stepMinutes = (step: StepUnit) => {
  const value = Number(step.slice(0, -1));
  return step.endsWith("h") ? value * 60 : value;
};

/**
 * New cards: Again and Hard wait a fixed time (againStep / hardStep), while Good and Easy are left out so
 * the card graduates straight away and FSRS picks the interval. Forgotten cards use the normal relearning steps.
 */
function newCardSteps(againStep: StepUnit, hardStep: StepUnit): LearningStepsStrategy {
  return (params, state, curStep) => {
    if (state !== State.New && state !== State.Learning) return BasicLearningStepsStrategy(params, state, curStep);
    return {
      [Rating.Again]: { scheduled_minutes: stepMinutes(againStep), next_step: 0 },
      [Rating.Hard]: { scheduled_minutes: stepMinutes(hardStep), next_step: curStep },
    };
  };
}

/** Takes one deck's settings (see `settingsForDeck`). */
export function makeScheduler(settings: PresetOptions & { parameters: number[] | null }, { fuzz = true }: { fuzz?: boolean } = {}): FSRS {
  const againStep = parseStep(settings.againStep) ?? (DEFAULT_PRESET_OPTIONS.againStep as StepUnit);
  const hardStep = parseStep(settings.hardStep) ?? (DEFAULT_PRESET_OPTIONS.hardStep as StepUnit);
  return fsrs({
    request_retention: settings.desiredRetention,
    maximum_interval: settings.maximumInterval,
    // Spread intervals out slightly so cards learned together don't stay bunched up forever.
    enable_fuzz: fuzz,
    enable_short_term: true,
    w: settings.parameters ?? default_w,
    learning_steps: [againStep, hardStep],
    relearning_steps: parseSteps(settings.relearningSteps) ?? default_relearning_steps,
  }).useStrategy(StrategyMode.LEARNING_STEPS, newCardSteps(againStep, hardStep));
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

/** The earliest of a deck's exam date and a card's own "due by" date, or null if neither is set. */
export function deadlineFor(examDate: string | null, cardDueBy: string | undefined): string | null {
  const dates = [examDate, cardDueBy].filter((d): d is string => isDateString(d));
  return dates.length ? dates.sort()[0] : null;
}

/**
 * Pulls a review forward so it comes due before a deadline ("YYYY-MM-DD", e.g. a test): at the latest the
 * day before, at the usual day rollover. Has no effect once that day has arrived, or on short learning steps.
 */
export function applyDeadline(card: StoredCard, deadline: string | null, now: Date): StoredCard {
  if (!deadline) return card;
  const [y, m, d] = deadline.split("-").map(Number);
  const latest = new Date(y, m - 1, d - 1, DAY_ROLLOVER_HOUR);
  if (latest.getTime() <= now.getTime() || new Date(card.due).getTime() <= latest.getTime()) return card;
  const days = Math.max(0, Math.round((latest.getTime() - dayStart(now).getTime()) / 86_400_000));
  return { ...card, due: latest.toISOString(), scheduledDays: days };
}

/** Answers a card: returns its new scheduling state and the review log entry. */
export function answerCard(
  scheduler: FSRS,
  deckId: string,
  cardId: string,
  stored: StoredCard | undefined,
  grade: Grade,
  now: Date,
  deadline: string | null = null,
): { card: StoredCard; record: ReviewRecord } {
  const { card, log } = scheduler.next(toFsrsCard(stored, now), now, grade);
  return { card: applyDeadline(fromFsrsCard(card), deadline, now), record: toReviewRecord(deckId, cardId, log) };
}

/** When each answer button would schedule the card next, for the labels above the buttons. */
export function previewDue(scheduler: FSRS, stored: StoredCard | undefined, now: Date, deadline: string | null = null): Record<Grade, Date> {
  const preview = scheduler.repeat(toFsrsCard(stored, now), now);
  const due = (g: Grade) => new Date(applyDeadline(fromFsrsCard(preview[g].card), deadline, now).due);
  return {
    [Rating.Again]: due(Rating.Again),
    [Rating.Hard]: due(Rating.Hard),
    [Rating.Good]: due(Rating.Good),
    [Rating.Easy]: due(Rating.Easy),
  } as Record<Grade, Date>;
}

/** Like Anki's "Bury": the card waits until tomorrow (the next day rollover) without being answered. */
export function buryCard(stored: StoredCard | undefined, now: Date): StoredCard {
  const base = stored ?? fromFsrsCard(createEmptyCard(now));
  return { ...base, due: nextDayStart(now).toISOString() };
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
  /** All settings; the deck's own new-card limit is looked up from `deckId`. */
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
      // A new card with a due date is a buried one, waiting until that day.
      if (!s || new Date(s.due).getTime() < endOfDay) fresh.push(id);
      continue;
    }
    const due = new Date(s.due).getTime();
    if (due >= endOfDay) continue;
    (isLearning(s) ? learning : review).push({ id, due });
  }
  learning.sort((a, b) => a.due - b.due);
  review.sort((a, b) => a.due - b.due);
  const { newDone } = doneToday(input);
  const { newPerDay } = settingsForDeck(input.settings, input.deckId);
  // No daily review limit: everything that's due can be reviewed.
  return {
    fresh: fresh.slice(0, Math.max(0, newPerDay - newDone)),
    learning,
    review,
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
