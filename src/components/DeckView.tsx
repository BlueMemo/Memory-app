"use client";

import Link from "next/link";
import { dictionaries, useI18n } from "@/i18n";
import { CHAPTER_SIZE, chapterCount, chapterRange, hasChapters } from "@/lib/chapters";
import { removeDeckOverride, useDeckOverrides } from "@/lib/deckOverrides";
import { isSharedDeck } from "@/lib/editableDecks";
import { useSavedDeckIds } from "@/lib/library";
import { fill } from "@/lib/practice";
import { settingsForDeck } from "@/lib/srs/core";
import { useSrsData } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { DeckCardsTable } from "./DeckCardsTable";
import { SaveDeckButton } from "./SaveDeckButton";
import { SharePanel } from "./SharePanel";
import { SrsDeckPanel } from "./SrsDeckPanel";

export function DeckView({ deck }: { deck: Deck }) {
  const { lang, t } = useI18n();
  const ordered = deck.kind === "ordered";
  const srs = useSrsData();
  const chapters = hasChapters(deck, settingsForDeck(srs.settings, deck.id).chapters);
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
      {deck.description && <p className="deck-description">{deck.description}</p>}

      <div className="deck-actions">
        {chapters ? (
          <>
            <Link href={`/decks/${deck.id}/practice?chapter=1`} className="btn accent big-btn">
              {t.deck.startChapterOne}
            </Link>
            <Link
              href={`/decks/${deck.id}/practice?mode=test`}
              className="btn nav"
              title={fill(t.deck.finalTestHint, { n: deck.cards.length })}
            >
              {t.deck.finalTest}
            </Link>
          </>
        ) : (
          <>
            <Link href={`/decks/${deck.id}/practice`} className="btn accent big-btn">
              {t.deck.start}
            </Link>
            <Link href={`/decks/${deck.id}/practice?mode=review`} className="btn nav" title={t.deck.jumpToRevisionHint}>
              {t.deck.jumpToRevision}
            </Link>
          </>
        )}
        {shared && <SaveDeckButton deckId={deck.id} />}
        {editable && (
          <Link href={`/library/edit/${deck.id}`} className="btn nav">
            {t.deck.editDeck}
          </Link>
        )}
        <Link href={`/library/settings?deck=${encodeURIComponent(deck.id)}`} className="btn nav">
          {t.deck.deckSettings}
        </Link>
      </div>
      {!chapters && deck.cards.length > CHAPTER_SIZE && (
        <p className="fine-print">{fill(t.deck.chaptersOffHint, { n: deck.cards.length, size: CHAPTER_SIZE })}</p>
      )}
      {edited && (
        <p className="fine-print">
          {t.deck.editedHint}{" "}
          <button className="link-button inline" onClick={() => window.confirm(t.deck.resetConfirm) && removeDeckOverride(deck.id)}>
            {t.deck.resetToOriginal}
          </button>
        </p>
      )}

      <SrsDeckPanel deck={deck} />
      {!shared && <SharePanel deck={deck} />}

      {chapters && (
        <>
          <h2 className="section-title">{t.deck.chaptersTitle}</h2>
          <p className="muted chapters-hint">{fill(t.deck.chaptersHint, { size: CHAPTER_SIZE })}</p>
          <ol className="chapter-list">
            {Array.from({ length: chapterCount(deck) }, (_, i) => {
              const n = i + 1;
              const { from, to } = chapterRange(deck, n);
              const first = deck.cards[from - 1];
              const last = deck.cards[to - 1];
              const label = (c: (typeof deck.cards)[number]) => (ordered ? c.answer : (c.prompt ?? c.answer));
              return (
                <li key={n}>
                  <div className="chapter-info">
                    <strong>{fill(t.deck.chapterLabel, { n })}</strong>
                    <span className="muted">
                      {fill(ordered ? t.deck.rangeOrdered : t.deck.rangeUnordered, { from, to })} · {label(first)}
                      {from !== to && ` – ${label(last)}`}
                    </span>
                  </div>
                  <div className="chapter-actions">
                    <Link href={`/decks/${deck.id}/practice?chapter=${n}`} className="btn accent">
                      {t.deck.learn}
                    </Link>
                    <Link href={`/decks/${deck.id}/practice?chapter=${n}&mode=review`} className="btn nav">
                      {t.deck.revise}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <DeckCardsTable deck={deck} editable={editable} />
    </main>
  );
}
