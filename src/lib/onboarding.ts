"use client";

import { useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";

// The introduction (/start): a few questions about what the learner wants to study, then the 10 countries
// tutorial, then an offer to create an account. The answers ("goals") tailor the site: recommended decks
// in Discover, an exam date prompt on decks, the Library's welcome line. They're kept in this browser and,
// once signed in, in `user_settings.goals` (the account's copy wins), and can be changed under Settings.
// "Where did you hear about us" is not part of the goals: it's counted anonymously in `signup_sources`.

/** The deck the introduction's tutorial practises: the landing page's 10 countries route. */
export const TUTORIAL_DECK_ID = "largest-countries";

export const GOALS = ["languages", "school", "exams", "general"] as const;
export type Goal = (typeof GOALS)[number];

export const STUDY_LANGUAGES = ["english", "spanish", "french", "german", "italian", "swedish", "other"] as const;
export type StudyLanguage = (typeof STUDY_LANGUAGES)[number];

export const SCHOOL_LEVELS = ["highSchool", "university", "other"] as const;
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];

export const SOURCES = ["tiktok", "instagram", "youtube", "friend", "school", "search", "other"] as const;
export type Source = (typeof SOURCES)[number];

export interface Goals {
  goal: Goal | null;
  /** Only for goal "languages". */
  language: StudyLanguage | null;
  /** Only for goal "school". */
  level: SchoolLevel | null;
}

export interface OnboardingState extends Goals {
  /** When the introduction was finished (the account step was reached); null until then. */
  completedAt: string | null;
  /** The tutorial was started from the introduction, so its results lead on to the account step. */
  tutorialPending: boolean;
  /** "Where did you hear about us" was already counted from this browser (count it once). */
  sourceSent: boolean;
}

export const EMPTY_ONBOARDING: OnboardingState = {
  goal: null,
  language: null,
  level: null,
  completedAt: null,
  tutorialPending: false,
  sourceSent: false,
};

const KEY = "onboarding.v1";

const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

/** Only the parts of saved goals that make sense: known values, and language/level only with their goal. */
export function normalizeGoals(raw: unknown): Goals {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const goal = pick(v.goal, GOALS);
  return {
    goal,
    language: goal === "languages" ? pick(v.language, STUDY_LANGUAGES) : null,
    level: goal === "school" ? pick(v.level, SCHOOL_LEVELS) : null,
  };
}

export function parseOnboarding(raw: string | null): OnboardingState {
  let v: Record<string, unknown> = {};
  try {
    v = raw ? JSON.parse(raw) : {};
  } catch {
    // Unreadable: start over.
  }
  return {
    ...normalizeGoals(v),
    completedAt: typeof v.completedAt === "string" ? v.completedAt : null,
    tutorialPending: v.tutorialPending === true,
    sourceSent: v.sourceSent === true,
  };
}

// ---------- browser storage, shared by every component through one store ----------

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached = EMPTY_ONBOARDING;

function read(): OnboardingState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: nothing saved.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseOnboarding(raw);
  }
  return cached;
}

function write(next: OnboardingState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Can't save: still use it for this visit.
    cachedRaw = undefined;
    cached = next;
  }
  listeners.forEach((fn) => fn());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore(subscribe, read, () => EMPTY_ONBOARDING);
}

/** Updates the answers (and progress); goal changes clear a language/level that no longer applies. */
export function setOnboarding(patch: Partial<OnboardingState>) {
  const current = read();
  const merged = { ...current, ...patch };
  const next: OnboardingState = { ...merged, ...normalizeGoals(merged) };
  write(next);
  const goalsChanged = next.goal !== current.goal || next.language !== current.language || next.level !== current.level;
  if (goalsChanged && activeUserId) void saveGoals(activeUserId, next);
}

// ---------- the account's copy ----------

let activeUserId: string | null = null;

const goalsOf = (s: Goals): Goals => ({ goal: s.goal, language: s.language, level: s.level });

async function saveGoals(userId: string, goals: Goals) {
  const supabase = getSupabaseBrowserClient();
  // Fails quietly until schema.sql has the goals column; the browser copy still works.
  await supabase?.from("user_settings").upsert({ user_id: userId, goals: goalsOf(goals) });
}

/** Called by AuthSync when the signed-in user changes: the account's goals win; otherwise it gets this browser's. */
export async function setActiveUserForOnboarding(userId: string | null) {
  activeUserId = userId;
  if (!userId) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data, error } = await supabase.from("user_settings").select("goals").eq("user_id", userId).maybeSingle();
  if (error || activeUserId !== userId) return;
  const saved = normalizeGoals(data?.goals);
  if (saved.goal) write({ ...read(), ...saved });
  else if (read().goal) await saveGoals(userId, read());
}

// ---------- "where did you hear about us", counted anonymously ----------

/** Adds one anonymous row (channel + goal, no user) for the team's statistics, once per browser. */
export async function sendSource(source: Source) {
  if (read().sourceSent) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { error } = await supabase.from("signup_sources").insert({ source, goal: read().goal });
  if (!error) setOnboarding({ sourceSent: true });
}

// ---------- what the goals change ----------

/** Words that find decks for a goal: the language's name in English and Swedish, or the exam's name. */
export function recommendationKeywords(goals: Goals): string[] {
  if (goals.goal === "languages" && goals.language && goals.language !== "other") return LANGUAGE_WORDS[goals.language];
  if (goals.goal === "exams") return ["högskoleprov"];
  return [];
}

const LANGUAGE_WORDS: Record<Exclude<StudyLanguage, "other">, string[]> = {
  english: ["english", "engelska"],
  spanish: ["spanish", "spanska"],
  french: ["french", "franska"],
  german: ["german", "tyska"],
  italian: ["italian", "italienska"],
  swedish: ["swedish", "svenska"],
};

/** The official deck that fits a goal best. */
export const officialDeckFor = (goal: Goal | null) => (goal === "languages" ? "hello-10-languages" : "largest-countries");

/** School and exam learners get asked for an exam date on their decks. */
export const wantsExamDate = (goal: Goal | null) => goal === "school" || goal === "exams";
