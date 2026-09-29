"use client";

import { useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";

// ---------- guest storage: saved deck ids live in the browser until the learner signs in ----------

const LOCAL_KEY = "library.savedDeckIds";
const localListeners = new Set<() => void>();
const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cachedIds: string[] = EMPTY;
let memoryIds: string[] | null = null; // used when storage is unavailable

export function parseIds(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Adds the id if missing, removes it if present. Newest saves come first. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
}

function readLocalIds(): string[] {
  if (memoryIds) return memoryIds;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOCAL_KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore needs the same array back until the data actually changes.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseIds(raw);
  }
  return cachedIds;
}

function writeLocalIds(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
    memoryIds = null;
  } catch {
    memoryIds = ids;
  }
  localListeners.forEach((fn) => fn());
}

function subscribeLocal(onChange: () => void) {
  localListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    localListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// ---------- account storage: saved deck ids in Supabase, once signed in ----------

let activeUserId: string | null = null;
let remoteIds: string[] = EMPTY;
const remoteListeners = new Set<() => void>();

function notifyRemote() {
  remoteListeners.forEach((fn) => fn());
}

function subscribeRemote(onChange: () => void) {
  remoteListeners.add(onChange);
  return () => remoteListeners.delete(onChange);
}

function readRemoteIds() {
  return remoteIds;
}

async function loadRemoteIds(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data } = await supabase
    .from("saved_decks")
    .select("deck_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (activeUserId !== userId) return; // the signed-in user changed again while this was in flight
  remoteIds = (data ?? []).map((row) => row.deck_id as string);
  notifyRemote();
}

/** Called centrally when the signed-in user changes — see components/AuthSync.tsx. */
export function setActiveUserForLibrary(userId: string | null) {
  activeUserId = userId;
  remoteIds = EMPTY;
  notifyRemote();
  if (userId) loadRemoteIds(userId);
}

// ---------- public API: reads and writes go to whichever branch is active ----------

export function useSavedDeckIds(): string[] {
  const local = useSyncExternalStore(subscribeLocal, readLocalIds, () => EMPTY);
  const remote = useSyncExternalStore(subscribeRemote, readRemoteIds, () => EMPTY);
  return activeUserId ? remote : local;
}

export async function toggleSavedDeck(id: string) {
  if (activeUserId) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      if (remoteIds.includes(id)) {
        await supabase.from("saved_decks").delete().eq("user_id", activeUserId).eq("deck_id", id);
      } else {
        await supabase.from("saved_decks").insert({ user_id: activeUserId, deck_id: id });
      }
      await loadRemoteIds(activeUserId);
      return;
    }
  }
  writeLocalIds(toggleId(readLocalIds(), id));
}

// ---------- one-time import of guest saves into a newly signed-in account ----------

export function hasLocalSavedDecks(): boolean {
  return readLocalIds().length > 0;
}

export async function importLocalSavedDecksToAccount(): Promise<number> {
  if (!activeUserId) return 0;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return 0;
  const ids = readLocalIds();
  if (ids.length === 0) return 0;
  const { error } = await supabase.from("saved_decks").insert(ids.map((id) => ({ user_id: activeUserId!, deck_id: id })));
  if (error) return 0;
  writeLocalIds([]);
  await loadRemoteIds(activeUserId);
  return ids.length;
}
