"use client";

import { useSyncExternalStore } from "react";
import type { Deck } from "./types";

// Decks a learner creates themselves live in the browser until accounts exist (phase 3).
const STORAGE_KEY = "library.userDecks";
const listeners = new Set<() => void>();
const EMPTY: Deck[] = [];

let cachedRaw: string | null = null;
let cachedDecks: Deck[] = EMPTY;
let memoryDecks: Deck[] | null = null; // used when storage is unavailable

function parseDecks(raw: string | null): Deck[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as Deck[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readDecks(): Deck[] {
  if (memoryDecks) return memoryDecks;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore needs the same array back until the data actually changes.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDecks = parseDecks(raw);
  }
  return cachedDecks;
}

function writeDecks(decks: Deck[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    memoryDecks = null;
  } catch {
    memoryDecks = decks;
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

export function useUserDecks(): Deck[] {
  return useSyncExternalStore(subscribe, readDecks, () => EMPTY);
}

export function useUserDeck(id: string): Deck | undefined {
  return useUserDecks().find((d) => d.id === id);
}

export function addUserDeck(deck: Deck) {
  writeDecks([deck, ...readDecks()]);
}

export function updateUserDeck(deck: Deck) {
  writeDecks(readDecks().map((d) => (d.id === deck.id ? deck : d)));
}

export function deleteUserDeck(id: string) {
  writeDecks(readDecks().filter((d) => d.id !== id));
}
