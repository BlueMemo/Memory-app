"use client";

import { chapterCount, chapterDeck, parseChapter } from "@/lib/chapters";
import { resolveDeck, useDeckOverrides, useDeckOverridesStatus } from "@/lib/deckOverrides";
import { settingsForDeck } from "@/lib/srs/core";
import { useSrsData, useSrsStatus } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { useMounted } from "@/lib/useMounted";
import { useUserDeck } from "@/lib/userDecks";
import { DeckNotFound } from "./DeckNotFound";
import { DeckView } from "./DeckView";
import { PracticeSession, type StartIn } from "./PracticeSession";
import { ReviewSession } from "./ReviewSession";

/**
 * Picks the deck a page should show, on the client:
 * - official decks: the learner's personal version if they've edited it, otherwise the original;
 * - decks the learner created: these only exist in their browser or account, so the server doesn't know them.
 * Waits until that's known, so the original (or "not found") doesn't flash first.
 * For practice, `chapter` (from ?chapter=) narrows a big deck down to one chapter.
 */
export function DeckGate({
  deckId,
  officialDeck,
  mode,
  startIn,
  chapter,
}: {
  deckId: string;
  officialDeck?: Deck;
  mode: "view" | "practice" | "review";
  startIn?: StartIn;
  chapter?: string | string[];
}) {
  const userDeck = useUserDeck(deckId);
  const overrides = useDeckOverrides();
  const overridesStatus = useDeckOverridesStatus();
  const srs = useSrsData();
  const srsStatus = useSrsStatus();
  const mounted = useMounted();

  if (!mounted) return null;
  if (officialDeck && overridesStatus === "loading") return null;
  const deck = officialDeck ? resolveDeck(officialDeck, overrides) : userDeck;
  if (!deck) return <DeckNotFound />;

  // Remount practice/review when what's being practised changes: another chapter or mode, or switching
  // between the original and a personal version. Not when cards are added or edited mid-session (A / E).
  const version = `${deck.id}-${deck === officialDeck ? "original" : "own"}`;
  if (mode === "view") return <DeckView deck={deck} />;
  if (mode === "review") return <ReviewSession key={version} deck={deck} />;

  // Chapters are a per-deck setting; wait for it before deciding what ?chapter= means.
  if (chapter !== undefined && srsStatus === "loading") return null;
  const n = parseChapter(deck, chapter, settingsForDeck(srs.settings, deck.id).chapters);
  if (n === null) return <PracticeSession key={`${version}-all-${startIn}`} deck={deck} startIn={startIn} />;
  const part = chapterDeck(deck, n);
  return (
    <PracticeSession
      key={`${version}-ch${n}-${startIn}`}
      deck={part.deck}
      startIn={startIn}
      positionOffset={part.offset}
      chapter={{ number: n, count: chapterCount(deck) }}
    />
  );
}
