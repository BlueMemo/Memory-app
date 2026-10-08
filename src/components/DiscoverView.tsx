"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { useCallback, useEffect, useState } from "react";
import { officialDecks } from "@/decks";
import { dictionaries, languages, useI18n } from "@/i18n";
import { officialDeckFor, recommendationKeywords, useOnboarding, type Goals } from "@/lib/onboarding";
import { fill } from "@/lib/practice";
import {
  deckSearchText,
  hasUnpublishedChanges,
  matchesQuery,
  myPublishedDecks,
  publishUpdate,
  searchPublishedDecks,
  type PublishedDeck,
  type PublishedSummary,
  type SearchFilters,
} from "@/lib/publishedDecks";
import { useUser } from "@/lib/supabase/useUser";
import { useUserDecks } from "@/lib/userDecks";
import { Avatar } from "./Avatar";
import { DeckTile } from "./DeckTile";
import { PageTabs } from "./PageTabs";

const SEARCH_DELAY_MS = 300;

/** Discover has two views: every deck, and (signed in) the decks you've shared yourself. */
export function DiscoverView() {
  const t = useI18n().t.discover;
  const { user } = useUser();
  const [view, setView] = useState<"all" | "mine">("all");
  const mine = view === "mine" && !!user;
  return (
    <>
      {user && (
        <div className="discover-views page" role="tablist" aria-label={t.viewsLabel}>
          <button type="button" role="tab" aria-selected={!mine} className={!mine ? "active" : ""} onClick={() => setView("all")}>
            {t.viewAll}
          </button>
          <button type="button" role="tab" aria-selected={mine} className={mine ? "active" : ""} onClick={() => setView("mine")}>
            {t.viewMine}
          </button>
        </div>
      )}
      {mine ? <MySharedDecks /> : <AllDecks />}
    </>
  );
}

/**
 * The decks the learner has published, each with whether their deck has changed since (new cards, edits)
 * and a button that publishes those changes as the next version with the same options.
 */
function MySharedDecks() {
  const { t: dict } = useI18n();
  const t = dict.discover;
  const own = useUserDecks();
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; decks: PublishedDeck[] }>({ status: "loading", decks: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(() => myPublishedDecks().then((decks) => setState(decks ? { status: "ready", decks } : { status: "error", decks: [] })), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function update(p: PublishedDeck) {
    const deck = own.find((d) => d.id === p.sourceDeckId);
    if (!deck) return;
    setBusy(p.id);
    const result = await publishUpdate(deck, p);
    setNotes((n) => ({ ...n, [p.sourceDeckId]: result ? fill(t.updated, { n: result.version }) : dict.share.error }));
    await load();
    setBusy(null);
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>{t.mineTitle}</h1>
        <p>{t.mineLead}</p>
      </section>
      {state.status === "loading" ? (
        <p className="empty-state">{t.searching}</p>
      ) : state.status === "error" ? (
        <p className="empty-state">{t.communityUnavailable}</p>
      ) : state.decks.length === 0 ? (
        <p className="empty-state">
          {t.mineEmpty}
        </p>
      ) : (
        <ul className="my-shared">
          {state.decks.map((p) => {
            const deck = own.find((d) => d.id === p.sourceDeckId);
            const changed = !!deck && hasUnpublishedChanges(deck, p);
            const added = deck ? deck.cards.length - p.cardCount : 0;
            return (
              <li key={p.id} className="my-shared-row">
                <div className="my-shared-main">
                  <Link href={`/shared/${p.id}`} className="my-shared-title">
                    {deck?.title ?? p.title}
                  </Link>
                  <span className="muted">
                    {fill(dict.share.published, { n: p.version })} · {p.listed ? dict.share.publishedListed : dict.share.publishedLink}
                    {p.copies > 0 && <> · {fill(t.copies, { n: p.copies })}</>}
                  </span>
                  {p.hidden ? (
                    <span className="my-shared-state error">{t.mineHidden}</span>
                  ) : !deck ? (
                    <span className="my-shared-state">{t.mineDeckGone}</span>
                  ) : changed ? (
                    <span className="my-shared-state changed">
                      {added > 0 ? fill(t.mineNewCards, { n: added }) : t.mineChanged}
                    </span>
                  ) : (
                    <span className="my-shared-state">{t.mineUpToDate}</span>
                  )}
                  {notes[p.sourceDeckId] && <span className="hint" role="status">{notes[p.sourceDeckId]}</span>}
                </div>
                <div className="my-shared-actions">
                  {deck && changed && !p.hidden && (
                    <button type="button" className="btn accent" disabled={busy !== null} onClick={() => void update(p)}>
                      {busy === p.id ? dict.share.publishing : t.publishUpdate}
                    </button>
                  )}
                  {deck && (
                    <Link href={`/library/settings?deck=${encodeURIComponent(deck.id)}#share`} className="btn nav">
                      {t.shareSettings}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function AllDecks() {
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

      <Recommended />

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

/**
 * "Recommended for you", from the introduction's answers (lib/onboarding.ts): the official deck that fits the
 * goal, then the most copied community decks that mention the language being learned (or the exam). Nothing
 * until the learner has answered.
 */
function Recommended() {
  const { t: dict } = useI18n();
  const t = dict.onboarding;
  const goals = useOnboarding();
  const community = useRecommendedCommunity(goals);
  if (!goals.goal) return null;
  const official = officialDecks.find((d) => d.id === officialDeckFor(goals.goal));
  return (
    <section className="recommended" aria-labelledby="recommended-title">
      <h2 className="section-title" id="recommended-title">
        {t.recommendedTitle}
      </h2>
      <p className="muted recommended-lead">{t.recommendedLead}</p>
      <ul className="deck-grid">
        {official && (
          <li>
            <DeckTile deck={official} />
          </li>
        )}
        {community.map((p) => (
          <li key={p.id}>
            <PublishedTile published={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Up to five popular community decks matching the goal's keywords (each keyword searched, results merged). */
function useRecommendedCommunity(goals: Goals) {
  const [decks, setDecks] = useState<PublishedSummary[]>([]);
  const keywords = recommendationKeywords(goals).join(",");
  useEffect(() => {
    let live = true;
    const words = keywords ? keywords.split(",") : [];
    void Promise.all(words.map((query) => searchPublishedDecks({ query, language: "all", type: "community", sort: "popular" }, 5))).then((results) => {
      if (!live) return;
      const seen = new Set<string>();
      const merged = results.flatMap((r) => r ?? []).filter((p) => !p.official && !seen.has(p.id) && seen.add(p.id));
      setDecks(merged.sort((a, b) => b.copies - a.copies).slice(0, 5));
    });
    return () => {
      live = false;
    };
  }, [keywords]);
  return keywords ? decks : [];
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
        {dict.decks.open}
        <ArrowRight size={16} weight="bold" aria-hidden="true" />
      </Link>
    </article>
  );
}
