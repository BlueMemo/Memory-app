"use client";

import Link from "next/link";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";

export function HomeView() {
  const t = useI18n().t.home;
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
            <Link href={`/decks/${deck.id}`} className="deck-tile">
              <div className="tags">
                {deck.official && <span className="tag accent">{t.official}</span>}
                <span className="tag">{deck.kind === "ordered" ? t.ordered : t.unordered}</span>
              </div>
              <h3>{deck.title}</h3>
              <p>{deck.description}</p>
              <span className="tile-footer">
                <span className="muted">{fill(t.cardCount, { n: deck.cards.length })}</span>
                <span className="tile-open">{t.open} →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
