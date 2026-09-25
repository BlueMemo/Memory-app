"use client";

import Link from "next/link";
import { getDeck } from "@/decks";
import { useI18n } from "@/i18n";
import { useSavedDeckIds } from "@/lib/library";
import type { Deck } from "@/lib/types";
import { DeckTile } from "./DeckTile";

export function LibraryView() {
  const t = useI18n().t.library;
  // Skip ids of decks that no longer exist (e.g. an official deck that was removed).
  const decks = useSavedDeckIds()
    .map(getDeck)
    .filter((d): d is Deck => d !== undefined);

  return (
    <main className="page">
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <h2 className="section-title">{t.savedDecks}</h2>
      {decks.length === 0 ? (
        <div className="empty-state">
          <p>{t.empty}</p>
          <Link href="/discover" className="tile-open">
            {t.emptyCta}
          </Link>
        </div>
      ) : (
        <ul className="deck-grid">
          {decks.map((deck) => (
            <li key={deck.id}>
              <DeckTile deck={deck} />
            </li>
          ))}
        </ul>
      )}

      <p className="fine-print">{t.deviceNote}</p>
    </main>
  );
}
