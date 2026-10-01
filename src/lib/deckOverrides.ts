"use client";

import { useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { Deck } from "./types";

// Personal versions of saved decks. Official (and, later, shared) decks belong to everyone, so a learner
// who edits one gets their own copy, stored here under the original deck's id. The original stays as it
// is for everyone else, and the deck keeps its id, so ★ Saved and spaced repetition stay attached.
// A deck without an override simply follows the original, including later fixes to it.

export type Overrides = Record<string, Deck>;
export type OverridesStatus = "loading" | "ready";

const EMPTY: Overrides = {};
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

const LOCAL_KEY = "library.deckOverrides";
let cachedRaw: string | null = null;
let cachedLocal: Overrides = EMPTY;
let memoryLocal: Overrides | null = null; // used when storage is unavailable or full

export function parseOverrides(raw: string | null): Overrides {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Overrides) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readLocal(): Overrides {
  if (memoryLocal) return memoryLocal;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOCAL_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLocal = parseOverrides(raw);
  }
  return cachedLocal;
}

function writeLocal(overrides: Overrides) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(overrides));
    memoryLocal = null;
  } catch {
    memoryLocal = overrides;
  }
  notify();
}

// ---------- account storage ----------

let activeUserId: string | null = null;
let remote: Overrides = EMPTY;
let remoteStatus: OverridesStatus = "loading";

async function loadRemote(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data, error } = await supabase.from("deck_overrides").select("deck_id, deck").eq("user_id", userId);
  if (activeUserId !== userId) return; // the signed-in user changed while this was in flight
  // A missing table (schema not re-run yet) just means no personal versions; originals still show.
  remote = error ? EMPTY : Object.fromEntries((data ?? []).map((r) => [r.deck_id as string, r.deck as Deck]));
  remoteStatus = "ready";
  notify();
}

/** Called centrally when the signed-in user changes — see components/AuthSync.tsx. */
export function setActiveUserForDeckOverrides(userId: string | null) {
  activeUserId = userId;
  remote = EMPTY;
  remoteStatus = "loading";
  notify();
  if (userId) loadRemote(userId);
}

// ---------- public API ----------

const current = () => (activeUserId ? remote : readLocal());

export function useDeckOverrides(): Overrides {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}

/** "loading" while a signed-in user's personal versions are still being fetched. */
export function useDeckOverridesStatus(): OverridesStatus {
  return useSyncExternalStore(subscribe, () => (activeUserId ? remoteStatus : "ready"), () => "loading" as OverridesStatus);
}

/** The learner's version of a deck if they've edited it, otherwise the original. */
export function resolveDeck(original: Deck, overrides: Overrides): Deck {
  return overrides[original.id] ?? original;
}

export async function saveDeckOverride(deck: Deck): Promise<boolean> {
  if (activeUserId) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      remote = { ...remote, [deck.id]: deck };
      notify();
      const { error } = await supabase
        .from("deck_overrides")
        .upsert({ user_id: activeUserId, deck_id: deck.id, deck, updated_at: new Date().toISOString() });
      return !error;
    }
  }
  writeLocal({ ...readLocal(), [deck.id]: deck });
  return true;
}

/** Throws away the learner's edits, so the deck follows the original again. */
export async function removeDeckOverride(deckId: string) {
  if (activeUserId) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const next = { ...remote };
      delete next[deckId];
      remote = next;
      notify();
      await supabase.from("deck_overrides").delete().eq("user_id", activeUserId).eq("deck_id", deckId);
      return;
    }
  }
  const next = { ...readLocal() };
  delete next[deckId];
  writeLocal(next);
}
