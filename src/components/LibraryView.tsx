"use client";

import Link from "next/link";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { resolveDeck, useDeckOverrides } from "@/lib/deckOverrides";
import { useSavedDecks } from "@/lib/editableDecks";
import { deckCounts } from "@/lib/srs/core";
import { isDeckEnabled, useSrsData, useSrsStatus } from "@/lib/srs/store";
import { useNow } from "@/lib/useNow";
import { useUser } from "@/lib/supabase/useUser";
import { useUserDecks } from "@/lib/userDecks";
import type { Deck } from "@/lib/types";
import { CreateDeckTile } from "./CreateDeckTile";
import { DeckTile } from "./DeckTile";
import { DeleteDeckButton } from "./DeleteDeckButton";
import { ImportGuestDataPrompt } from "./ImportGuestDataPrompt";
import { SrsCounts } from "./ReviewSession";
import { SaveDeckButton } from "./SaveDeckButton";

export function LibraryView() {
  const t = useI18n().t.library;
  const { user } = useUser();
  const savedDecks = useSavedDecks();
  const userDecks = useUserDecks();
  const overrides = useDeckOverrides();
  // Official decks can have spaced repetition on without being saved, so all of them are checked for due cards.
  const officialResolved = officialDecks.map((d) => resolveDeck(d, overrides));

  return (
    <main className="page">
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <ImportGuestDataPrompt />

      <DueForReview decks={[...userDecks, ...officialResolved]} />

      <div className="section-title-row">
        <h2 className="section-title">{t.yourDecks}</h2>
        {userDecks.length + savedDecks.length > 0 && (
          <Link href="/library/cards" className="tile-open">
            {t.browseCards}
          </Link>
        )}
      </div>
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
              <DeckTile
                deck={deck}
                edited={overrides[deck.id] !== undefined}
                action={
                  <div className="tile-actions">
                    <Link href={`/library/edit/${deck.id}`} className="save-btn">
                      {t.editDeck}
                    </Link>
                    <SaveDeckButton deckId={deck.id} />
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <p className="fine-print">{user ? t.syncedNote : t.deviceNote}</p>
    </main>
  );
}

/** Decks with spaced repetition switched on that have cards to study today, like Anki's deck list. */
function DueForReview({ decks }: { decks: Deck[] }) {
  const { t: dict } = useI18n();
  const data = useSrsData();
  const status = useSrsStatus();
  const now = useNow();
  if (status === "loading") return null;

  const due = decks
    .filter((d) => isDeckEnabled(data, d.id))
    .map((deck) => ({
      deck,
      counts: deckCounts({ deckId: deck.id, cardIds: deck.cards.map((c) => c.id), cards: data.cards, logs: data.logs, settings: data.settings, now }),
    }))
    .filter(({ counts }) => counts.new + counts.learning + counts.review > 0);
  if (due.length === 0 && !decks.some((d) => isDeckEnabled(data, d.id))) return null;

  return (
    <>
      <h2 className="section-title">{dict.library.dueTitle}</h2>
      {due.length === 0 ? (
        <p className="empty-state">{dict.library.dueEmpty}</p>
      ) : (
        <ul className="due-list">
          {due.map(({ deck, counts }) => (
            <li key={deck.id}>
              <Link href={`/decks/${deck.id}`} className="due-title">
                {deck.title}
              </Link>
              <SrsCounts counts={counts} t={dict.srs} />
              <Link href={`/decks/${deck.id}/review`} className="btn accent">
                {dict.srs.studyNow}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
