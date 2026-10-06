"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { officialDecks } from "@/decks";
import { dictionaries, languages, useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { deckSearchText, matchesQuery, searchPublishedDecks, type PublishedSummary, type SearchFilters } from "@/lib/publishedDecks";
import { Avatar } from "./Avatar";
import { DeckTile } from "./DeckTile";
import { PageTabs } from "./PageTabs";

const SEARCH_DELAY_MS = 300;

export function DiscoverView() {
  const { t: dict, lang } = useI18n();
  const t = dict.discover;
  const [filters, setFilters] = useState<SearchFilters>({ query: "", language: "all", type: "all", sort: "popular" });
  const set = (patch: Partial<SearchFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const kindMatches = (kind: string) => filters.type === "all" || filters.type === "official" || filters.type === "community" || filters.type === kind;
  // Official decks have no dates or copy counts: they keep their own order unless sorted by name.
  const official = officialDecks
    .filter((d) => (filters.language === "all" || d.language === filters.language) && kindMatches(d.kind) && matchesQuery(deckSearchText(d), filters.query))
    .sort((a, b) => (filters.sort === "az" ? a.title.localeCompare(b.title, lang) : filters.sort === "za" ? b.title.localeCompare(a.title, lang) : 0));
  const showOfficial = filters.type !== "community";
  const showCommunity = filters.type !== "official";
  const published = useCommunitySearch(filters);
  // Decks a moderator published as official are listed with the official ones; the rest are community decks.
  const publishedOfficial = published.decks.filter((p) => p.official);
  const community = { ...published, decks: published.decks.filter((p) => !p.official) };
  const searching = filters.query.trim() !== "" || filters.language !== "all" || filters.type !== "all";

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
          <select value={filters.type} onChange={(e) => set({ type: e.target.value as SearchFilters["type"] })}>
            <option value="all">{t.filterAll}</option>
            <option value="official">{t.officialDecks}</option>
            <option value="community">{t.communityDecks}</option>
            <option value="ordered">{dict.decks.ordered}</option>
            <option value="unordered">{dict.decks.unordered}</option>
          </select>
        </label>
        <label>
          <span>{t.sortLabel}</span>
          <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as SearchFilters["sort"] })}>
            <option value="popular">{t.sortPopular}</option>
            <option value="az">{t.sortAz}</option>
            <option value="za">{t.sortZa}</option>
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
          </select>
        </label>
      </div>

      <PageTabs
        label={t.searchLabel}
        tabs={[
          { id: "official", title: t.officialDecks },
          { id: "community", title: t.communityDecks },
        ]}
      />

      {showOfficial && (
        <>
      <h2 className="section-title" id="official">{t.officialDecks}</h2>
      {official.length === 0 && publishedOfficial.length === 0 ? (
        <p className="empty-state">{t.noResults}</p>
      ) : (
        <ul className="deck-grid">
          {official.map((deck) => (
            <li key={deck.id}>
              <DeckTile deck={deck} />
            </li>
          ))}
          {publishedOfficial.map((p) => (
            <li key={p.id}>
              <PublishedTile published={p} />
            </li>
          ))}
        </ul>
      )}
        </>
      )}

      {showCommunity && (
        <>
      <h2 className="section-title" id="community">{t.communityDecks}</h2>
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
        </>
      )}
    </main>
  );
}

/** Searches published decks as the filters change, waiting for a pause in typing. */
function useCommunitySearch(filters: SearchFilters) {
  const [result, setResult] = useState<{ status: "loading" | "ready" | "error"; decks: PublishedSummary[] }>({ status: "loading", decks: [] });
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

function PublishedTile({ published }: { published: PublishedSummary }) {
  const { t: dict } = useI18n();
  const href = `/shared/${published.id}`;
  return (
    <article className="deck-tile">
      <div className="tags">
        {published.official && <span className="tag accent">{dict.decks.official}</span>}
        <span className="tag">{published.kind === "ordered" ? dict.decks.ordered : dict.decks.unordered}</span>
        <span className="tag">{dictionaries[published.language].languageName}</span>
      </div>
      <h3>
        <Link href={href}>{published.title}</Link>
      </h3>
      <p className="muted published-author">
        {!published.official && <Avatar url={published.avatarUrl} name={published.author} size={22} seed={published.authorId} />}
        {fill(dict.discover.byAuthor, { author: published.official ? dict.siteName : (published.author ?? dict.sharedDeck.unknownAuthor) })}
        {published.copies > 0 && <span> · {fill(dict.discover.copies, { n: published.copies })}</span>}
      </p>
      {published.description && <p>{published.description}</p>}
      <div className="tile-footer">
        <span className="muted">{fill(dict.decks.cardCount, { n: published.cardCount })}</span>
      </div>
      <Link href={href} className="tile-open">
        {dict.decks.open} →
      </Link>
    </article>
  );
}
