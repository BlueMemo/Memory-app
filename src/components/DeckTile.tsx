"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import type { Deck } from "@/lib/types";
import { SaveDeckButton } from "./SaveDeckButton";

export function DeckTile({ deck }: { deck: Deck }) {
  const t = useI18n().t.decks;
  const href = `/decks/${deck.id}`;
  return (
    <article className="deck-tile">
      <div className="tags">
        {deck.official && <span className="tag accent">{t.official}</span>}
        <span className="tag">{deck.kind === "ordered" ? t.ordered : t.unordered}</span>
      </div>
      <h3>
        <Link href={href}>{deck.title}</Link>
      </h3>
      <p>{deck.description}</p>
      <div className="tile-footer">
        <span className="muted">{fill(t.cardCount, { n: deck.cards.length })}</span>
        <SaveDeckButton deckId={deck.id} />
      </div>
      <Link href={href} className="tile-open">
        {t.open} →
      </Link>
    </article>
  );
}
