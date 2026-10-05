"use client";

import { useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "../supabase/client";
import {
  answerCard,
  buryCard as buryStored,
  cardKey,
  deadlineFor,
  dayStart,
  DEFAULT_SETTINGS,
  makeScheduler,
  normalizeSettings,
  settingsForDeck,
  type Grade,
  type ReviewRecord,
  type SrsSettings,
  type StoredCard,
} from "./core";

// Spaced-repetition data: settings, which decks use it, each card's schedule and the review log.
// Guests keep it in browser storage; signed-in users in Supabase (see supabase/schema.sql). Unlike the
// deck stores, changes apply in memory immediately and save in the background, so answering a card
// never waits for the network.

export interface SrsData {
  settings: SrsSettings;
  /** Deck ids with spaced repetition switched on (true) or explicitly off (false). */
  enabled: Record<string, boolean>;
  /** Scheduling state by `cardKey(deckId, cardId)`. Cards without an entry are new. */
  cards: Record<string, StoredCard>;
  /** Recent review log entries (at least today's), used for the daily limits. */
  logs: ReviewRecord[];
}

export type SrsStatus = "loading" | "ready" | "error";

const EMPTY: SrsData = { settings: DEFAULT_SETTINGS, enabled: {}, cards: {}, logs: [] };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// ---------- guest storage ----------

const LOCAL_KEY = "srs.v1";
/** Guests only need recent logs (for today's limits); older ones are dropped to save browser space. */
const LOCAL_LOG_DAYS = 30;

let cachedRaw: string | null = null;
let cachedLocal: SrsData = EMPTY;
let memoryLocal: SrsData | null = null; // used when storage is unavailable or full
let localStatus: SrsStatus = "ready";

export function parseLocal(raw: string | null): SrsData {
  if (!raw) return EMPTY;
  try {
    const v = JSON.parse(raw) as Partial<SrsData>;
    return {
      settings: normalizeSettings(v.settings),
      enabled: v.enabled && typeof v.enabled === "object" ? v.enabled : {},
      cards: v.cards && typeof v.cards === "object" ? v.cards : {},
      logs: Array.isArray(v.logs) ? v.logs : [],
    };
  } catch {
    return EMPTY;
  }
}

function readLocal(): SrsData {
  if (memoryLocal) return memoryLocal;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOCAL_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLocal = parseLocal(raw);
  }
  return cachedLocal;
}

function writeLocal(data: SrsData) {
  const cutoff = Date.now() - LOCAL_LOG_DAYS * 24 * 3600_000;
  const trimmed = { ...data, logs: data.logs.filter((l) => new Date(l.review).getTime() >= cutoff) };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(trimmed));
    memoryLocal = null;
    localStatus = "ready";
  } catch {
    // Storage full or blocked: keep working for this visit and say so, rather than losing reviews silently.
    memoryLocal = trimmed;
    localStatus = "error";
  }
  notify();
}

// ---------- account storage ----------

let activeUserId: string | null = null;
let remote: SrsData = EMPTY;
let remoteStatus: SrsStatus = "loading";

interface CardRow {
  deck_id: string;
  card_id: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

const rowToCard = (r: CardRow): StoredCard => ({
  due: r.due,
  stability: r.stability,
  difficulty: r.difficulty,
  elapsedDays: r.elapsed_days,
  scheduledDays: r.scheduled_days,
  learningSteps: r.learning_steps,
  reps: r.reps,
  lapses: r.lapses,
  state: r.state,
  lastReview: r.last_review,
});

const cardToRow = (userId: string, deckId: string, cardId: string, c: StoredCard) => ({
  user_id: userId,
  deck_id: deckId,
  card_id: cardId,
  due: c.due,
  stability: c.stability,
  difficulty: c.difficulty,
  elapsed_days: c.elapsedDays,
  scheduled_days: c.scheduledDays,
  learning_steps: c.learningSteps,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  last_review: c.lastReview,
});

interface LogRow {
  deck_id: string;
  card_id: string;
  rating: number;
  state: number;
  review: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
}

const rowToLog = (r: LogRow): ReviewRecord => ({
  deckId: r.deck_id,
  cardId: r.card_id,
  rating: r.rating as Grade,
  state: r.state,
  review: r.review,
  due: r.due,
  stability: r.stability,
  difficulty: r.difficulty,
  elapsedDays: r.elapsed_days,
  lastElapsedDays: r.last_elapsed_days,
  scheduledDays: r.scheduled_days,
  learningSteps: r.learning_steps,
});

const logToRow = (userId: string, l: ReviewRecord) => ({
  user_id: userId,
  deck_id: l.deckId,
  card_id: l.cardId,
  rating: l.rating,
  state: l.state,
  review: l.review,
  due: l.due,
  stability: l.stability,
  difficulty: l.difficulty,
  elapsed_days: l.elapsedDays,
  last_elapsed_days: l.lastElapsedDays,
  scheduled_days: l.scheduledDays,
  learning_steps: l.learningSteps,
});

async function loadRemote(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  // Only today's log is needed in memory (for the daily limits); the full history stays in the database.
  const since = dayStart(new Date()).toISOString();
  const [settings, decks, cards, logs] = await Promise.all([
    supabase.from("user_settings").select("srs").eq("user_id", userId).maybeSingle(),
    supabase.from("srs_deck_settings").select("deck_id, enabled").eq("user_id", userId),
    supabase.from("srs_cards").select("*").eq("user_id", userId),
    supabase.from("srs_review_logs").select("*").eq("user_id", userId).gte("review", since),
  ]);
  if (activeUserId !== userId) return; // the signed-in user changed while this was in flight
  if (settings.error || decks.error || cards.error || logs.error) {
    remoteStatus = "error";
    notify();
    return;
  }
  remote = {
    settings: normalizeSettings(settings.data?.srs),
    enabled: Object.fromEntries((decks.data ?? []).map((r) => [r.deck_id as string, r.enabled as boolean])),
    cards: Object.fromEntries((cards.data as CardRow[]).map((r) => [cardKey(r.deck_id, r.card_id), rowToCard(r)])),
    logs: (logs.data as LogRow[]).map(rowToLog),
  };
  remoteStatus = "ready";
  notify();
}

/**
 * Study writes (answers, buries, undos) go through one queue, so they reach the database in the order
 * they happened — e.g. an undo's delete never overtakes the insert it undoes.
 */
let studyWrites: Promise<unknown> = Promise.resolve();
const enqueue = (write: () => Promise<unknown>) => (studyWrites = studyWrites.then(write, write));

/** Runs a database write; a failure is surfaced through the status instead of being swallowed. */
async function persist(write: () => PromiseLike<{ error: unknown }>) {
  const { error } = await write();
  if (error) {
    remoteStatus = "error";
    notify();
  }
}

/** Called centrally when the signed-in user changes — see components/AuthSync.tsx. */
export function setActiveUserForSrs(userId: string | null) {
  activeUserId = userId;
  remote = EMPTY;
  remoteStatus = "loading";
  notify();
  if (userId) loadRemote(userId);
}

// ---------- public API ----------

/** The signed-in user whose SRS data is loaded, or null for a guest. */
export const getActiveSrsUserId = () => activeUserId;

const current = () => (activeUserId ? remote : readLocal());

function apply(next: SrsData) {
  if (activeUserId) {
    remote = next;
    notify();
  } else {
    writeLocal(next);
  }
}

export function useSrsData(): SrsData {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}

/** "error" means changes may not have been saved (e.g. the database tables are missing, or storage is full). */
export function useSrsStatus(): SrsStatus {
  return useSyncExternalStore(subscribe, () => (activeUserId ? remoteStatus : localStatus), () => "loading" as SrsStatus);
}

/** Whether SRS data currently goes to an account (true) or this browser (false). */
export function useSrsSignedIn(): boolean {
  return useSyncExternalStore(subscribe, () => activeUserId !== null, () => false);
}

export function isDeckEnabled(data: SrsData, deckId: string): boolean {
  return data.enabled[deckId] === true;
}

export async function updateSrsSettings(patch: Partial<SrsSettings>) {
  const data = current();
  const settings = normalizeSettings({ ...data.settings, ...patch });
  apply({ ...data, settings });
  const userId = activeUserId;
  const supabase = getSupabaseBrowserClient();
  if (userId && supabase) {
    await persist(() => supabase.from("user_settings").upsert({ user_id: userId, srs: settings }));
  }
}

export async function setDeckSrsEnabled(deckId: string, enabled: boolean) {
  const data = current();
  apply({ ...data, enabled: { ...data.enabled, [deckId]: enabled } });
  const userId = activeUserId;
  const supabase = getSupabaseBrowserClient();
  if (userId && supabase) {
    await persist(() => supabase.from("srs_deck_settings").upsert({ user_id: userId, deck_id: deckId, enabled }));
  }
}

/** What a study action changed, so it can be undone (see `undoSrsChange`). */
export interface SrsChange {
  deckId: string;
  cardId: string;
  /** The card's schedule before the action (undefined: it was new and untouched). */
  before: StoredCard | undefined;
  /** The review log entry the action added, if it was an answer. */
  record?: ReviewRecord;
}

/** Answers a card with Again/Hard/Good/Easy and reschedules it; `cardDueBy` is the card's own deadline. */
export function reviewCard(deckId: string, cardId: string, grade: Grade, now = new Date(), cardDueBy?: string): SrsChange {
  const data = current();
  const key = cardKey(deckId, cardId);
  const settings = settingsForDeck(data.settings, deckId);
  const scheduler = makeScheduler(settings);
  const before = data.cards[key];
  const { card, record } = answerCard(scheduler, deckId, cardId, before, grade, now, deadlineFor(settings.examDate, cardDueBy));
  apply({ ...data, cards: { ...data.cards, [key]: card }, logs: [...data.logs, record] });
  const userId = activeUserId;
  const supabase = getSupabaseBrowserClient();
  if (userId && supabase) {
    enqueue(() =>
      Promise.all([
        persist(() => supabase.from("srs_cards").upsert(cardToRow(userId, deckId, cardId, card))),
        persist(() => supabase.from("srs_review_logs").insert(logToRow(userId, record))),
      ]),
    );
  }
  return { deckId, cardId, before, record };
}

/** Like Anki's "Bury": the card is skipped until tomorrow, without counting as an answer. */
export function buryCard(deckId: string, cardId: string, now = new Date()): SrsChange {
  const data = current();
  const key = cardKey(deckId, cardId);
  const before = data.cards[key];
  const card = buryStored(before, now);
  apply({ ...data, cards: { ...data.cards, [key]: card } });
  const userId = activeUserId;
  const supabase = getSupabaseBrowserClient();
  if (userId && supabase) enqueue(() => persist(() => supabase.from("srs_cards").upsert(cardToRow(userId, deckId, cardId, card))));
  return { deckId, cardId, before };
}

/** Undoes an answer or a bury: restores the card's earlier schedule and drops the review it logged. */
export function undoSrsChange(change: SrsChange) {
  const data = current();
  const key = cardKey(change.deckId, change.cardId);
  const cards = { ...data.cards };
  if (change.before) cards[key] = change.before;
  else delete cards[key];
  // The record is the same object that reviewCard added to the in-memory log.
  const logs = change.record ? data.logs.filter((l) => l !== change.record) : data.logs;
  apply({ ...data, cards, logs });
  const userId = activeUserId;
  const supabase = getSupabaseBrowserClient();
  if (!userId || !supabase) return;
  const { deckId, cardId, before, record } = change;
  enqueue(() => Promise.all([
    before
      ? persist(() => supabase.from("srs_cards").upsert(cardToRow(userId, deckId, cardId, before)))
      : persist(() => supabase.from("srs_cards").delete().eq("user_id", userId).eq("deck_id", deckId).eq("card_id", cardId)),
    record
      ? persist(() =>
          supabase.from("srs_review_logs").delete().eq("user_id", userId).eq("deck_id", deckId).eq("card_id", cardId).eq("review", record.review),
        )
      : Promise.resolve(),
  ]));
}

/** Like Anki's "Forget": the card goes back to new, keeping its review history. */
export async function forgetCard(deckId: string, cardId: string) {
  const data = current();
  const cards = { ...data.cards };
  delete cards[cardKey(deckId, cardId)];
  apply({ ...data, cards });
  const userId = activeUserId;
  const supabase = getSupabaseBrowserClient();
  if (userId && supabase) {
    await persist(() => supabase.from("srs_cards").delete().eq("user_id", userId).eq("deck_id", deckId).eq("card_id", cardId));
  }
}

/** Removes all scheduling for a deck, e.g. when the deck itself is deleted. */
export async function removeDeckSrs(deckId: string) {
  const data = current();
  const prefix = cardKey(deckId, "");
  const cards = Object.fromEntries(Object.entries(data.cards).filter(([k]) => !k.startsWith(prefix)));
  const enabled = { ...data.enabled };
  delete enabled[deckId];
  apply({ ...data, cards, enabled, logs: data.logs.filter((l) => l.deckId !== deckId) });
  const userId = activeUserId;
  const supabase = getSupabaseBrowserClient();
  if (userId && supabase) {
    await Promise.all([
      persist(() => supabase.from("srs_cards").delete().eq("user_id", userId).eq("deck_id", deckId)),
      persist(() => supabase.from("srs_deck_settings").delete().eq("user_id", userId).eq("deck_id", deckId)),
      persist(() => supabase.from("srs_review_logs").delete().eq("user_id", userId).eq("deck_id", deckId)),
    ]);
  }
}
