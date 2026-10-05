"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { officialDecks } from "@/decks";
import { dictionaries, languages, useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { deckSearchText, matchesQuery, searchPublishedDecks, type PublishedDeck, type SearchFilters } from "@/lib/publishedDecks";
import { DeckTile } from "./DeckTile";

const SEARCH_DELAY_MS = 300;

export function DiscoverView() {
  const { t: dict } = useI18n();
  const t = dict.discover;
  const [filters, setFilters] = useState<SearchFilters>({ query: "", language: "all", kind: "all" });
  const set = (patch: Partial<SearchFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const official = officialDecks.filter(
    (d) =>
      (filters.language === "all" || d.language === filters.language) &&
      (filters.kind === "all" || d.kind === filters.kind) &&
      matchesQuery(deckSearchText(d), filters.query),
  );
  const community = useCommunitySearch(filters);
  const searching = filters.query.trim() !== "" || filters.language !== "all" || filters.kind !== "all";

  return (
    <main className="page">
      <section className="hero">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <div className="discover-search">
        <input
          type="search"
          aria-label={t.searchLabel}
          placeholder={t.searchPlaceholder}
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
        <label>
          <span>{t.filterLanguage}</span>
          <select value={filters.language} onChange={(e) => set({ language: e.target.value as SearchFilters["language"] })}>
            <option value="all">{t.filterAll}</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {dictionaries[l].languageName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.filterKind}</span>
          <select value={filters.kind} onChange={(e) => set({ kind: e.target.value as SearchFilters["kind"] })}>
            <option value="all">{t.filterAll}</option>
            <option value="ordered">{dict.decks.ordered}</option>
            <option value="unordered">{dict.decks.unordered}</option>
          </select>
        </label>
      </div>

      <h2 className="section-title">{t.officialDecks}</h2>
      {official.length === 0 ? (
        <p className="empty-state">{t.noResults}</p>
      ) : (
        <ul className="deck-grid">
          {official.map((deck) => (
            <li key={deck.id}>
              <DeckTile deck={deck} />
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">{t.communityDecks}</h2>
      {community.status === "loading" ? (
        <p className="empty-state">{t.searching}</p>
      ) : community.status === "error" ? (
        <p className="empty-state">{t.communityUnavailable}</p>
      ) : community.decks.length === 0 ? (
        <p className="empty-state">{searching ? t.noResults : t.communityEmpty}</p>
      ) : (
        <ul className="deck-grid">
          {community.decks.map((p) => (
            <li key={p.id}>
              <PublishedTile published={p} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/** Searches published decks as the filters change, waiting for a pause in typing. */
function useCommunitySearch(filters: SearchFilters) {
  const [result, setResult] = useState<{ status: "loading" | "ready" | "error"; decks: PublishedDeck[] }>({ status: "loading", decks: [] });
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      void searchPublishedDecks(filters).then((decks) => {
        if (live) setResult(decks ? { status: "ready", decks } : { status: "error", decks: [] });
      });
    }, SEARCH_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [filters]);
  return result;
}

function PublishedTile({ published }: { published: PublishedDeck }) {
  const { t: dict } = useI18n();
  const { deck } = published;
  const href = `/shared/${published.id}`;
  return (
    <article className="deck-tile">
      <div className="tags">
        <span className="tag">{deck.kind === "ordered" ? dict.decks.ordered : dict.decks.unordered}</span>
        <span className="tag">{dictionaries[deck.language].languageName}</span>
      </div>
      <h3>
        <Link href={href}>{deck.title}</Link>
      </h3>
      <p className="muted published-author">{fill(dict.discover.byAuthor, { author: published.author ?? dict.sharedDeck.unknownAuthor })}</p>
      <p>{deck.description}</p>
      <div className="tile-footer">
        <span className="muted">{fill(dict.decks.cardCount, { n: deck.cards.length })}</span>
      </div>
      <Link href={href} className="tile-open">
        {dict.decks.open} →
      </Link>
    </article>
  );
}
