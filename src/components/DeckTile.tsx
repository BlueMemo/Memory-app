"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import type { Deck } from "@/lib/types";
import { SaveDeckButton } from "./SaveDeckButton";

/**
 * `action` overrides the default save toggle, e.g. with edit/delete buttons in the library.
 * `edited` marks a saved deck the learner has their own version of.
 */
/** `hideKind` leaves out the memory route / associations tag (the library list keeps tiles minimal). */
export function DeckTile({ deck, action, edited, hideKind }: { deck: Deck; action?: ReactNode; edited?: boolean; hideKind?: boolean }) {
  const t = useI18n().t.decks;
  const href = `/decks/${deck.id}`;
  return (
    <article className="deck-tile">
      <div className="tags">
        {deck.official && <span className="tag accent">{t.official}</span>}
        {edited && <span className="tag">{t.edited}</span>}
        {!hideKind && <span className="tag">{deck.kind === "ordered" ? t.ordered : t.unordered}</span>}
      </div>
      <h3>
        <Link href={href}>{deck.title}</Link>
      </h3>
      {deck.description && <p>{deck.description}</p>}
      <div className="tile-footer">
        <span className="muted">{fill(t.cardCount, { n: deck.cards.length })}</span>
        {action ?? <SaveDeckButton deckId={deck.id} />}
      </div>
      <Link href={href} className="tile-open">
        {t.open} →
      </Link>
    </article>
  );
}
