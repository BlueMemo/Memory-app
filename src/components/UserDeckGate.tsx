"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n";
import { useUserDeck } from "@/lib/userDecks";
import { DeckView } from "./DeckView";
import { PracticeSession } from "./PracticeSession";

const noSubscription = () => () => {};

/**
 * Decks created in the browser aren't known to the server, so `/decks/[deckId]` falls back to this
 * for any id that isn't an official deck. `mounted` avoids flashing "not found" before hydration,
 * since the deck only becomes visible once we can read it from localStorage on the client.
 * `mode` picks the view instead of taking a render prop, since a Server Component can't pass a
 * function down to this Client Component.
 */
export function UserDeckGate({ deckId, mode }: { deckId: string; mode: "view" | "practice" }) {
  const t = useI18n().t.deck;
  const deck = useUserDeck(deckId);
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);

  if (deck) return mode === "view" ? <DeckView deck={deck} /> : <PracticeSession deck={deck} />;
  if (!mounted) return null;
  return (
    <main className="page narrow">
      <h1 className="deck-title">{t.notFoundTitle}</h1>
      <p className="deck-description">{t.notFoundText}</p>
      <Link href="/library" className="link-muted">
        {t.backToLibrary}
      </Link>
    </main>
  );
}
