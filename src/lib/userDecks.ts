"use client";

import { useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { Card, Deck, Lang } from "./types";

// ---------- guest storage: decks a learner creates live in the browser until they sign in ----------

const LOCAL_KEY = "library.userDecks";
const localListeners = new Set<() => void>();
const EMPTY: Deck[] = [];

let cachedRaw: string | null = null;
let cachedLocalDecks: Deck[] = EMPTY;
let memoryDecks: Deck[] | null = null; // used when storage is unavailable

function parseLocalDecks(raw: string | null): Deck[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as Deck[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function readLocalDecks(): Deck[] {
  if (memoryDecks) return memoryDecks;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOCAL_KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore needs the same array back until the data actually changes.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLocalDecks = parseLocalDecks(raw);
  }
  return cachedLocalDecks;
}

function writeLocalDecks(decks: Deck[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(decks));
    memoryDecks = null;
  } catch {
    memoryDecks = decks;
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

// ---------- account storage: decks in Supabase, once signed in ----------

interface DeckRow {
  id: string;
  title: string;
  description: string;
  language: string;
  kind: string;
  order_label: string | null;
  instructions: unknown;
  cards: unknown;
}

function rowToDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    language: row.language as Lang,
    kind: row.kind as Deck["kind"],
    ...(row.order_label ? { orderLabel: row.order_label } : {}),
    instructions: Array.isArray(row.instructions) ? (row.instructions as string[]) : [],
    cards: Array.isArray(row.cards) ? (row.cards as Card[]) : [],
  };
}

function deckToRow(deck: Deck, userId: string) {
  return {
    id: deck.id,
    user_id: userId,
    title: deck.title,
    description: deck.description,
    language: deck.language,
    kind: deck.kind,
    order_label: deck.orderLabel ?? null,
    instructions: deck.instructions,
    cards: deck.cards,
  };
}

let activeUserId: string | null = null;
let remoteDecks: Deck[] = EMPTY;
const remoteListeners = new Set<() => void>();

function notifyRemote() {
  remoteListeners.forEach((fn) => fn());
}

function subscribeRemote(onChange: () => void) {
  remoteListeners.add(onChange);
  return () => remoteListeners.delete(onChange);
}

function readRemoteDecks() {
  return remoteDecks;
}

async function loadRemoteDecks(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data } = await supabase.from("decks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (activeUserId !== userId) return; // the signed-in user changed again while this was in flight
  remoteDecks = (data ?? []).map(rowToDeck);
  notifyRemote();
}

/** Called centrally when the signed-in user changes — see components/AuthSync.tsx. */
export function setActiveUserForDecks(userId: string | null) {
  activeUserId = userId;
  remoteDecks = EMPTY;
  notifyRemote();
  if (userId) loadRemoteDecks(userId);
}

// ---------- public API: reads and writes go to whichever branch is active ----------

export function useUserDecks(): Deck[] {
  const local = useSyncExternalStore(subscribeLocal, readLocalDecks, () => EMPTY);
  const remote = useSyncExternalStore(subscribeRemote, readRemoteDecks, () => EMPTY);
  return activeUserId ? remote : local;
}

export function useUserDeck(id: string): Deck | undefined {
  return useUserDecks().find((d) => d.id === id);
}

export async function addUserDeck(deck: Deck) {
  if (activeUserId) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.from("decks").insert(deckToRow(deck, activeUserId));
      await loadRemoteDecks(activeUserId);
      return;
    }
  }
  writeLocalDecks([deck, ...readLocalDecks()]);
}

export async function updateUserDeck(deck: Deck) {
  if (activeUserId) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.from("decks").update(deckToRow(deck, activeUserId)).eq("id", deck.id).eq("user_id", activeUserId);
      await loadRemoteDecks(activeUserId);
      return;
    }
  }
  writeLocalDecks(readLocalDecks().map((d) => (d.id === deck.id ? deck : d)));
}

export async function deleteUserDeck(id: string) {
  if (activeUserId) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.from("decks").delete().eq("id", id).eq("user_id", activeUserId);
      await loadRemoteDecks(activeUserId);
      return;
    }
  }
  writeLocalDecks(readLocalDecks().filter((d) => d.id !== id));
}

// ---------- one-time import of guest decks into a newly signed-in account ----------

export function localDeckCount(): number {
  return readLocalDecks().length;
}

export async function importLocalDecksToAccount(): Promise<number> {
  if (!activeUserId) return 0;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return 0;
  const decks = readLocalDecks();
  if (decks.length === 0) return 0;
  const { error } = await supabase.from("decks").insert(decks.map((d) => deckToRow(d, activeUserId!)));
  if (error) return 0;
  writeLocalDecks([]);
  await loadRemoteDecks(activeUserId);
  return decks.length;
}
