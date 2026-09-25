"use client";

import Link from "next/link";
import { dictionaries, useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import type { Deck } from "@/lib/types";

export function DeckView({ deck }: { deck: Deck }) {
  const { lang, t } = useI18n();
  const ordered = deck.kind === "ordered";
  return (
    <main className="page narrow">
      <Link href="/" className="link-muted">
        {t.deck.back}
      </Link>

      <div className="tags deck-tags">
        {deck.official && <span className="tag accent">{t.home.official}</span>}
        <span className="tag">{ordered ? t.home.ordered : t.home.unordered}</span>
        <span className="tag">{fill(t.home.cardCount, { n: deck.cards.length })}</span>
        {deck.language !== lang && (
          <span className="tag">{fill(t.deck.contentLanguage, { lang: dictionaries[deck.language].languageName })}</span>
        )}
      </div>
      <h1 className="deck-title">{deck.title}</h1>
      <p className="deck-description">{deck.description}</p>

      <Link href={`/decks/${deck.id}/practice`} className="btn accent big-btn">
        {t.deck.start}
      </Link>

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
