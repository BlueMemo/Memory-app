"use client";

import { useSyncExternalStore } from "react";

// Saved decks live in the browser until accounts exist (phase 3), when they move to the user's account.
const STORAGE_KEY = "library.savedDeckIds";
const listeners = new Set<() => void>();
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

function readIds(): string[] {
  if (memoryIds) return memoryIds;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
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

function writeIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    memoryIds = null;
  } catch {
    memoryIds = ids;
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

export function useSavedDeckIds(): string[] {
  return useSyncExternalStore(subscribe, readIds, () => EMPTY);
}

export function toggleSavedDeck(id: string) {
  writeIds(toggleId(readIds(), id));
}
