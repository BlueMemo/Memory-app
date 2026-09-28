"use client";

import Link from "next/link";
import { dictionaries, useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import type { Deck } from "@/lib/types";
import { SaveDeckButton } from "./SaveDeckButton";

export function DeckView({ deck }: { deck: Deck }) {
  const { lang, t } = useI18n();
  const ordered = deck.kind === "ordered";
  const backHref = deck.official ? "/discover" : "/library";
  const backLabel = deck.official ? t.deck.back : t.deck.backToLibrary;
  return (
    <main className="page narrow">
      <Link href={backHref} className="link-muted">
        {backLabel}
      </Link>

      <div className="tags deck-tags">
        {deck.official && <span className="tag accent">{t.decks.official}</span>}
        <span className="tag">{ordered ? t.decks.ordered : t.decks.unordered}</span>
        <span className="tag">{fill(t.decks.cardCount, { n: deck.cards.length })}</span>
        {deck.language !== lang && (
          <span className="tag">{fill(t.deck.contentLanguage, { lang: dictionaries[deck.language].languageName })}</span>
        )}
      </div>
      <h1 className="deck-title">{deck.title}</h1>
      <p className="deck-description">{deck.description}</p>

      <div className="deck-actions">
        <Link href={`/decks/${deck.id}/practice`} className="btn accent big-btn">
          {t.deck.start}
        </Link>
        {deck.official && <SaveDeckButton deckId={deck.id} />}
        {!deck.official && (
          <Link href={`/library/edit/${deck.id}`} className="btn nav">
            {t.deck.editDeck}
          </Link>
        )}
      </div>

      <h2 className="section-title">{t.deck.inside}</h2>
      {ordered ? (
        <ol className="inside-list">
          {deck.cards.map((c) => (
            <li key={c.id}>{c.answer}</li>
          ))}
        </ol>
      ) : (
        <ul className="inside-list">
          {deck.cards.map((c) => (
            <li key={c.id}>
              {c.prompt}: <strong>{c.answer}</strong>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
