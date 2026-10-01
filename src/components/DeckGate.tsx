"use client";

import { resolveDeck, useDeckOverrides, useDeckOverridesStatus } from "@/lib/deckOverrides";
import type { Deck } from "@/lib/types";
import { useMounted } from "@/lib/useMounted";
import { useUserDeck } from "@/lib/userDecks";
import { DeckNotFound } from "./DeckNotFound";
import { DeckView } from "./DeckView";
import { PracticeSession } from "./PracticeSession";
import { ReviewSession } from "./ReviewSession";

/**
 * Picks the deck a page should show, on the client:
 * - official decks: the learner's personal version if they've edited it, otherwise the original;
 * - decks the learner created: these only exist in their browser or account, so the server doesn't know them.
 * Waits until that's known, so the original (or "not found") doesn't flash first.
 */
export function DeckGate({
  deckId,
  officialDeck,
  mode,
  startInReview,
}: {
  deckId: string;
  officialDeck?: Deck;
  mode: "view" | "practice" | "review";
  startInReview?: boolean;
}) {
  const userDeck = useUserDeck(deckId);
  const overrides = useDeckOverrides();
  const overridesStatus = useDeckOverridesStatus();
  const mounted = useMounted();

  if (!mounted) return null;
  if (officialDeck && overridesStatus === "loading") return null;
  const deck = officialDeck ? resolveDeck(officialDeck, overrides) : userDeck;
  if (!deck) return <DeckNotFound />;

  // Remount practice/review if the deck's content changes underneath (e.g. edits saved on another device).
  const key = `${deck.id}-${deck === officialDeck ? "original" : "own"}-${deck.cards.length}`;
  if (mode === "view") return <DeckView deck={deck} />;
  if (mode === "review") return <ReviewSession key={key} deck={deck} />;
  return <PracticeSession key={key} deck={deck} startInReview={startInReview} />;
}
