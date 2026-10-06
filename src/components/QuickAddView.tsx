"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { useEditableDecks } from "@/lib/editableDecks";
import { fill } from "@/lib/practice";
import { CardForm } from "./CardForm";

const LAST_DECK_KEY = "quickAdd.deck";

const readLastDeck = () => {
  try {
    return localStorage.getItem(LAST_DECK_KEY);
  } catch {
    return null;
  }
};

/**
 * /library/add (A in the Library): add cards one after another. Pick a deck, save, and a fresh empty card
 * appears; the page is only left when the learner chooses to (Done). Remembers the last deck used.
 * Opened from a deck page (A there), it starts on that deck and Done goes back to it.
 */
export function QuickAddView({ initialDeckId, returnToDeck = false }: { initialDeckId: string | null; returnToDeck?: boolean }) {
  const { t: dict } = useI18n();
  const t = dict.cardForm;
  const decks = useEditableDecks();
  const [chosen, setChosen] = useState<string | null>(initialDeckId);
  const [count, setCount] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const backHref = returnToDeck && initialDeckId ? `/decks/${encodeURIComponent(initialDeckId)}` : "/library";
  const deckId = [chosen, readLastDeck()].find((id) => id && decks.some((d) => d.id === id)) ?? decks[0]?.id;
  const choose = (id: string) => {
    setChosen(id);
    setNote(null);
    try {
      localStorage.setItem(LAST_DECK_KEY, id);
    } catch {
      // Not remembered; still fine for this visit.
    }
  };

  return (
    <main className="page narrow">
      <Link href={backHref} className="link-muted">
        {returnToDeck ? `← ${dict.practice.backToDeck}` : dict.srsSettings.backToLibrary}
      </Link>
      <section className="page-intro">
        <h1>{t.pageTitle}</h1>
        <p>{t.pageLead}</p>
      </section>

      {!deckId ? (
        <div className="empty-state">
          <p>{t.noDecks}</p>
          <Link href="/library/new" className="tile-open">
            {t.createDeck}
          </Link>
        </div>
      ) : (
        <>
          {note && <p className="notice">{note}</p>}
          {/* A new key after each save gives a fresh, empty form. */}
          <CardForm
            key={`${deckId}-${count}`}
            decks={decks}
            deckId={deckId}
            onDeckChange={choose}
            autoFocus
            onSaved={(deck) => {
              choose(deck.id);
              setCount((n) => n + 1);
              setNote(fill(t.savedNext, { deck: deck.title }));
            }}
            actions={
              <Link href={backHref} className="btn nav">
                {t.done}
              </Link>
            }
          />
        </>
      )}
    </main>
  );
}
