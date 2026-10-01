"use client";

import Link from "next/link";
import { dictionaries, useI18n } from "@/i18n";
import { removeDeckOverride, useDeckOverrides } from "@/lib/deckOverrides";
import { isSharedDeck } from "@/lib/editableDecks";
import { useSavedDeckIds } from "@/lib/library";
import { fill } from "@/lib/practice";
import type { Deck } from "@/lib/types";
import { SaveDeckButton } from "./SaveDeckButton";
import { SrsDeckPanel } from "./SrsDeckPanel";

export function DeckView({ deck }: { deck: Deck }) {
  const { lang, t } = useI18n();
  const ordered = deck.kind === "ordered";
  const shared = isSharedDeck(deck.id);
  const saved = useSavedDeckIds().includes(deck.id);
  const overrides = useDeckOverrides();
  const edited = shared && overrides[deck.id] !== undefined;
  // Saved decks are the learner's to edit, just like decks they made; editing a shared deck gives them
  // a personal version while the original stays unchanged for everyone else.
  const editable = !shared || saved;
  const backHref = shared && !saved ? "/discover" : "/library";
  const backLabel = shared && !saved ? t.deck.back : t.deck.backToLibrary;

  return (
    <main className="page narrow">
      <Link href={backHref} className="link-muted">
        {backLabel}
      </Link>

      <div className="tags deck-tags">
        {deck.official && <span className="tag accent">{t.decks.official}</span>}
        {edited && (
          <span className="tag" title={t.deck.editedHint}>
            {t.decks.edited}
          </span>
        )}
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
        <Link href={`/decks/${deck.id}/practice?mode=review`} className="btn nav" title={t.deck.jumpToRevisionHint}>
          {t.deck.jumpToRevision}
        </Link>
        {shared && <SaveDeckButton deckId={deck.id} />}
        {editable && (
          <Link href={`/library/edit/${deck.id}`} className="btn nav">
            {t.deck.editDeck}
          </Link>
        )}
      </div>
      {edited && (
        <p className="fine-print">
          {t.deck.editedHint}{" "}
          <button className="link-button inline" onClick={() => window.confirm(t.deck.resetConfirm) && removeDeckOverride(deck.id)}>
            {t.deck.resetToOriginal}
          </button>
        </p>
      )}

      <SrsDeckPanel deck={deck} />

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
