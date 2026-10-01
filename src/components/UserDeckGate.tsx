"use client";

import { useMounted } from "@/lib/useMounted";
import { useUserDeck } from "@/lib/userDecks";
import { DeckNotFound } from "./DeckNotFound";
import { DeckView } from "./DeckView";
import { PracticeSession } from "./PracticeSession";
import { ReviewSession } from "./ReviewSession";

/**
 * Decks created in the browser aren't known to the server, so `/decks/[deckId]` falls back to this
 * for any id that isn't an official deck. `mounted` avoids flashing "not found" before hydration,
 * since the deck only becomes visible once we can read it from localStorage on the client.
 */
export function UserDeckGate({
  deckId,
  mode,
  startInReview,
}: {
  deckId: string;
  mode: "view" | "practice" | "review";
  startInReview?: boolean;
}) {
  const deck = useUserDeck(deckId);
  const mounted = useMounted();

  if (deck) {
    if (mode === "view") return <DeckView deck={deck} />;
    if (mode === "review") return <ReviewSession deck={deck} />;
    return <PracticeSession deck={deck} startInReview={startInReview} />;
  }
  if (!mounted) return null;
  return <DeckNotFound />;
}
