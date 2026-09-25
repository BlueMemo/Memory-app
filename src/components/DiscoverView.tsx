"use client";

import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { DeckTile } from "./DeckTile";

export function DiscoverView() {
  const t = useI18n().t.discover;
  return (
    <main className="page">
      <section className="hero">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <h2 className="section-title">{t.officialDecks}</h2>
      <ul className="deck-grid">
        {officialDecks.map((deck) => (
          <li key={deck.id}>
            <DeckTile deck={deck} />
          </li>
        ))}
      </ul>

      <h2 className="section-title">{t.communityDecks}</h2>
      <p className="empty-state">{t.communitySoon}</p>
    </main>
  );
}
