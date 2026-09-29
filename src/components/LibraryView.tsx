"use client";

import Link from "next/link";
import { getDeck } from "@/decks";
import { useI18n } from "@/i18n";
import { useSavedDeckIds } from "@/lib/library";
import { useUser } from "@/lib/supabase/useUser";
import { useUserDecks } from "@/lib/userDecks";
import type { Deck } from "@/lib/types";
import { CreateDeckTile } from "./CreateDeckTile";
import { DeckTile } from "./DeckTile";
import { DeleteDeckButton } from "./DeleteDeckButton";
import { ImportGuestDataPrompt } from "./ImportGuestDataPrompt";

export function LibraryView() {
  const t = useI18n().t.library;
  const { user } = useUser();
  // Skip ids of decks that no longer exist (e.g. an official deck that was removed).
  const savedDecks = useSavedDeckIds()
    .map(getDeck)
    .filter((d): d is Deck => d !== undefined);
  const userDecks = useUserDecks();

  return (
    <main className="page">
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <ImportGuestDataPrompt />

      <h2 className="section-title">{t.yourDecks}</h2>
      <ul className="deck-grid">
        <li>
          <CreateDeckTile />
        </li>
        {userDecks.map((deck) => (
          <li key={deck.id}>
            <DeckTile
              deck={deck}
              action={
                <div className="tile-actions">
                  <Link href={`/library/edit/${deck.id}`} className="save-btn">
                    {t.editDeck}
                  </Link>
                  <DeleteDeckButton deckId={deck.id} />
                </div>
              }
            />
          </li>
        ))}
      </ul>

      <h2 className="section-title">{t.savedDecks}</h2>
      {savedDecks.length === 0 ? (
        <div className="empty-state">
          <p>{t.empty}</p>
          <Link href="/discover" className="tile-open">
            {t.emptyCta}
          </Link>
        </div>
      ) : (
        <ul className="deck-grid">
          {savedDecks.map((deck) => (
            <li key={deck.id}>
              <DeckTile deck={deck} />
            </li>
          ))}
        </ul>
      )}

      <p className="fine-print">{user ? t.syncedNote : t.deviceNote}</p>
    </main>
  );
}
