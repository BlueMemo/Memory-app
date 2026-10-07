"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { useDeckOverrides } from "@/lib/deckOverrides";
import { useSavedDecks } from "@/lib/editableDecks";
import { cardKey, deckCounts } from "@/lib/srs/core";
import { isDeckEnabled, useSrsData, type SrsData } from "@/lib/srs/store";
import { setPreferences, usePreferences, type LibrarySort, type LibraryView as ViewMode } from "@/lib/preferences";
import { useNow } from "@/lib/useNow";
import { useUser } from "@/lib/supabase/useUser";
import { useUserDecks } from "@/lib/userDecks";
import type { Deck } from "@/lib/types";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreateDeckTile } from "./CreateDeckTile";
import { DeckTile } from "./DeckTile";
import { GearIcon } from "./GearIcon";
import { PageTabs } from "./PageTabs";
import { isTyping } from "./PracticeSession";
import { ImportGuestDataPrompt } from "./ImportGuestDataPrompt";

export function LibraryView() {
  const t = useI18n().t.library;
  const { user } = useUser();
  const savedDecks = useSavedDecks();
  const userDecks = useUserDecks();
  const overrides = useDeckOverrides();
  const prefs = usePreferences();
  const srs = useSrsData();
  const now = useNow();
  const ownIds = new Set(userDecks.map((d) => d.id));
  const sorted = (decks: Deck[]) => sortDecks(decks, prefs.librarySort, srs, now);

  // Grouping from the general settings: own and saved decks apart (the default), together, or by kind.
  const all = sorted([...userDecks, ...savedDecks]);
  const sections: { key: string; title: string; decks: Deck[]; withCreate: boolean }[] =
    prefs.libraryGroup === "all"
      ? [{ key: "all", title: t.allDecks, decks: all, withCreate: true }]
      : prefs.libraryGroup === "kind"
        ? [
            { key: "ordered", title: t.routeDecks, decks: all.filter((d) => d.kind === "ordered"), withCreate: true },
            { key: "unordered", title: t.associationDecks, decks: all.filter((d) => d.kind === "unordered"), withCreate: false },
          ]
        : [
            { key: "own", title: t.yourDecks, decks: sorted(userDecks), withCreate: true },
            { key: "saved", title: t.savedDecks, decks: sorted(savedDecks), withCreate: false },
          ];

  const settingsLink = (deck: Deck) => (
    <Link href={`/library/settings?deck=${encodeURIComponent(deck.id)}`} className="save-btn" title={t.deckSettings} aria-label={`${t.deckSettings}: ${deck.title}`}>
      <GearIcon />
    </Link>
  );
  // Editing, removing and everything else about a deck lives in its settings (the gear).
  const actions = (deck: Deck) => <div className="tile-actions">{settingsLink(deck)}</div>;

  // A adds a card, B opens the card browser (not while typing, and not with modifier keys).
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      const key = e.key.toLowerCase();
      if (key === "a") router.push("/library/add");
      else if (key === "b") router.push("/library/cards");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <main className="page">
      <section className="page-intro library-head">
        <div>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </div>
        {userDecks.length + savedDecks.length > 0 && (
          <div className="library-quick">
            <Link href="/library/add" className="btn accent">
              {t.addCard} <kbd>A</kbd>
            </Link>
            <Link href="/library/cards" className="btn nav">
              {t.browseCards} <kbd>B</kbd>
            </Link>
          </div>
        )}
      </section>

      <ImportGuestDataPrompt />

      <PageTabs label={t.title} tabs={sections.map((section) => ({ id: `group-${section.key}`, title: section.title }))} />

      <div className="library-toolbar">
        <ViewSwitch view={prefs.libraryView} />
      </div>

      {sections.map((section) => (
        <section key={section.key} id={`group-${section.key}`}>
          <h2 className="section-title">{section.title}</h2>
          {section.decks.length === 0 && !section.withCreate ? (
            <div className="empty-state">
              <p>{t.empty}</p>
              <Link href="/discover" className="tile-open">
                {t.emptyCta}
              </Link>
            </div>
          ) : (
            <DeckCollection
              decks={section.decks}
              view={prefs.libraryView}
              withCreate={section.withCreate}
              action={actions}
              edited={(deck) => !ownIds.has(deck.id) && overrides[deck.id] !== undefined}
              srs={srs}
            />
          )}
        </section>
      ))}

      <p className="fine-print">{user ? t.syncedNote : t.deviceNote}</p>
      <p>
        <Link href="/library/settings" className="tile-open">
          {t.srsSettingsLink}
        </Link>
      </p>
    </main>
  );
}

/** Orders decks by the library sort setting. The source lists are already newest first ("recent"). */
function sortDecks(decks: Deck[], sort: LibrarySort, srs: SrsData, now: Date): Deck[] {
  if (sort === "recent") return decks;
  if (sort === "name") return [...decks].sort((a, b) => a.title.localeCompare(b.title));
  const score = (deck: Deck) => {
    if (sort === "due") {
      if (!isDeckEnabled(srs, deck.id)) return -1;
      const c = deckCounts({ deckId: deck.id, cardIds: deck.cards.map((x) => x.id), cards: srs.cards, logs: srs.logs, settings: srs.settings, now });
      return c.new + c.learning + c.review;
    }
    // "practised": the latest spaced-repetition review of any card in the deck.
    let latest = 0;
    for (const card of deck.cards) {
      const last = srs.cards[cardKey(deck.id, card.id)]?.lastReview;
      if (last) latest = Math.max(latest, new Date(last).getTime());
    }
    return latest;
  };
  const scores = new Map(decks.map((d) => [d.id, score(d)]));
  return [...decks].sort((a, b) => scores.get(b.id)! - scores.get(a.id)!);
}

/** The quick tiles / rows / list switch at the top of the library (same setting as in Settings). */
function ViewSwitch({ view }: { view: ViewMode }) {
  const t = useI18n().t.settings;
  const options: [ViewMode, string][] = [
    ["grid", t.viewGrid],
    ["rows", t.viewRows],
    ["list", t.viewList],
  ];
  return (
    <div className="segmented small" role="group" aria-label={t.libraryView}>
      {options.map(([value, label]) => (
        <button key={value} type="button" aria-pressed={value === view} className={value === view ? "active" : undefined} onClick={() => setPreferences({ libraryView: value })}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** One group of decks as tiles, full-width rows, or a compact list. */
function DeckCollection(props: {
  decks: Deck[];
  view: ViewMode;
  withCreate: boolean;
  action: (deck: Deck) => ReactNode;
  edited: (deck: Deck) => boolean;
  srs: SrsData;
}) {
  const { t: dict } = useI18n();
  const now = useNow();
  if (props.view === "list") {
    return (
      <ul className="deck-list">
        {props.withCreate && (
          <li className="deck-list-create">
            <Link href="/library/new" className="tile-open">
              {dict.library.createNewDeck}
            </Link>
            <Link href="/library/import" className="link-muted">
              {dict.library.importDeck}
            </Link>
          </li>
        )}
        {props.decks.length > 0 && (
          <li className="deck-list-head" aria-hidden="true">
            <span />
            <span>{dict.library.colCards}</span>
            <span className="srs-count-learning">{dict.srs.learningCount}</span>
            <span className="srs-count-review">{dict.srs.reviewCount}</span>
            <span className="srs-count-new">{dict.srs.newCount}</span>
            <span />
          </li>
        )}
        {props.decks.map((deck) => {
          const due = isDeckEnabled(props.srs, deck.id)
            ? deckCounts({ deckId: deck.id, cardIds: deck.cards.map((c) => c.id), cards: props.srs.cards, logs: props.srs.logs, settings: props.srs.settings, now })
            : null;
          return (
            <li key={deck.id}>
              <Link href={`/decks/${deck.id}`} className="deck-list-title">
                {deck.title}
              </Link>
              <span className="deck-list-num deck-list-cards">{deck.cards.length}</span>
              {/* Learning, due, new: only the numbers, right-aligned under the header's labels; zeros stay grey. */}
              {(["learning", "review", "new"] as const).map((key) => (
                <span key={key} className={`deck-list-num deck-list-count srs-count-${key}${!due || due[key] === 0 ? " zero" : ""}`}>
                  {due ? due[key] : "–"}
                </span>
              ))}
              {props.action(deck)}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className={`deck-grid${props.view === "rows" ? " rows" : ""}`}>
      {props.withCreate && (
        <li>
          <CreateDeckTile />
        </li>
      )}
      {props.decks.map((deck) => (
        <li key={deck.id}>
          <DeckTile deck={deck} edited={props.edited(deck)} action={props.action(deck)} hideKind />
        </li>
      ))}
    </ul>
  );
}
