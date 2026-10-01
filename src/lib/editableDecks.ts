"use client";

import { getDeck } from "@/decks";
import { resolveDeck, saveDeckOverride, useDeckOverrides } from "./deckOverrides";
import { useSavedDeckIds } from "./library";
import type { Deck } from "./types";
import { updateUserDeck, useUserDecks } from "./userDecks";

// Saved decks and decks the learner created behave the same everywhere they can be edited
// (deck editor, card browser). This module hides where an edit is stored.

/** Saved decks, each as the learner's own edited version if there is one. */
export function useSavedDecks(): Deck[] {
  const overrides = useDeckOverrides();
  return useSavedDeckIds()
    .map(getDeck)
    .filter((d): d is Deck => d !== undefined) // skip ids of decks that no longer exist
    .map((d) => resolveDeck(d, overrides));
}

/** Every deck the learner can edit: their own decks first, then saved decks. */
export function useEditableDecks(): Deck[] {
  const own = useUserDecks();
  const saved = useSavedDecks();
  return [...own, ...saved];
}

/** True for decks that belong to everyone (official), where edits become the learner's personal version. */
export function isSharedDeck(deckId: string): boolean {
  return getDeck(deckId) !== undefined;
}

/** Saves an edited deck: the learner's own decks are updated, shared decks get a personal version. */
export async function saveEditedDeck(deck: Deck) {
  if (isSharedDeck(deck.id)) await saveDeckOverride(deck);
  else await updateUserDeck(deck);
}
