"use client";

import { useSyncExternalStore } from "react";

// Short "white box" tours that point at parts of the page the first time someone sees them (the Library's
// tabs, the card form's fields). Which ones were seen is kept per browser (`tours.v1`), like preferences.

export type TourId = "library" | "cardForm";

const KEY = "tours.v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Partial<Record<TourId, boolean>> = {};

function read(): Partial<Record<TourId, boolean>> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: nothing seen.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? JSON.parse(raw) : {};
    } catch {
      cached = {};
    }
  }
  return cached;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Whether a tour was already seen (true on the server, so nothing flashes before the browser knows). */
export function useTourSeen(id: TourId): boolean {
  return useSyncExternalStore(subscribe, () => read()[id] === true, () => true);
}

export function markTourSeen(id: TourId) {
  const next = { ...read(), [id]: true };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cachedRaw = undefined;
    cached = next;
  }
  listeners.forEach((fn) => fn());
}
