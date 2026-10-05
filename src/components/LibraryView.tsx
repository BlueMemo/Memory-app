"use client";

import Link from "next/link";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { resolveDeck, useDeckOverrides } from "@/lib/deckOverrides";
import { useSavedDecks } from "@/lib/editableDecks";
import { cardKey, deckCounts } from "@/lib/srs/core";
import { isDeckEnabled, useSrsData, useSrsStatus, type SrsData } from "@/lib/srs/store";
import { setPreferences, usePreferences, type LibrarySort, type LibraryView as ViewMode } from "@/lib/preferences";
import { fill } from "@/lib/practice";
import { useNow } from "@/lib/useNow";
import { useUser } from "@/lib/supabase/useUser";
import { useUserDecks } from "@/lib/userDecks";
import type { Deck } from "@/lib/types";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreateDeckTile } from "./CreateDeckTile";
import { DeckTile } from "./DeckTile";
import { DeleteDeckButton } from "./DeleteDeckButton";
import { GearIcon } from "./GearIcon";
import { isTyping } from "./PracticeSession";
import { ImportGuestDataPrompt } from "./ImportGuestDataPrompt";
import { SrsCounts } from "./ReviewSession";
import { SaveDeckButton } from "./SaveDeckButton";

export function LibraryView() {
  const t = useI18n().t.library;
  const { user } = useUser();
  const savedDecks = useSavedDecks();
  const userDecks = useUserDecks();
  const overrides = useDeckOverrides();
  // Official decks can have spaced repetition on without being saved, so all of them are checked for due cards.
  const officialResolved = officialDecks.map((d) => resolveDeck(d, overrides));
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
  const ownActions = (deck: Deck) => (
    <div className="tile-actions">
      <Link href={`/library/edit/${deck.id}`} className="save-btn">
        {t.editDeck}
      </Link>
      {settingsLink(deck)}
      <DeleteDeckButton deckId={deck.id} />
    </div>
  );
  const savedActions = (deck: Deck) => (
    <div className="tile-actions">
      <Link href={`/library/edit/${deck.id}`} className="save-btn">
        {t.editDeck}
      </Link>
      {settingsLink(deck)}
      <SaveDeckButton deckId={deck.id} />
    </div>
  );

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
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <ImportGuestDataPrompt />

      <DueForReview decks={[...userDecks, ...officialResolved]} />

      <div className="library-toolbar">
        <ViewSwitch view={prefs.libraryView} />
        <div className="library-quick">
          {userDecks.length + savedDecks.length > 0 && (
            <>
              <Link href="/library/add" className="btn accent">
                {t.addCard} <kbd>A</kbd>
              </Link>
              <Link href="/library/cards" className="btn nav">
                {t.browseCards} <kbd>B</kbd>
              </Link>
            </>
          )}
        </div>
      </div>

      {sections.map((section) => (
        <section key={section.key}>
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
              action={(deck) => (ownIds.has(deck.id) ? ownActions(deck) : savedActions(deck))}
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
        {props.decks.map((deck) => {
          const due = isDeckEnabled(props.srs, deck.id)
            ? deckCounts({ deckId: deck.id, cardIds: deck.cards.map((c) => c.id), cards: props.srs.cards, logs: props.srs.logs, settings: props.srs.settings, now })
            : null;
          return (
            <li key={deck.id}>
              <Link href={`/decks/${deck.id}`} className="deck-list-title">
                {deck.title}
              </Link>
              <span className="tag">{deck.kind === "ordered" ? dict.decks.ordered : dict.decks.unordered}</span>
              <span className="muted">{fill(dict.decks.cardCount, { n: deck.cards.length })}</span>
              {due && <SrsCounts counts={due} t={dict.srs} />}
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
          <DeckTile deck={deck} edited={props.edited(deck)} action={props.action(deck)} />
        </li>
      ))}
    </ul>
  );
}

/** Decks with spaced repetition switched on that have cards to study today, like Anki's deck list. */
function DueForReview({ decks }: { decks: Deck[] }) {
  const { t: dict } = useI18n();
  const data = useSrsData();
  const status = useSrsStatus();
  const now = useNow();
  if (status === "loading") return null;

  const due = decks
    .filter((d) => isDeckEnabled(data, d.id))
    .map((deck) => ({
      deck,
      counts: deckCounts({ deckId: deck.id, cardIds: deck.cards.map((c) => c.id), cards: data.cards, logs: data.logs, settings: data.settings, now }),
    }))
    .filter(({ counts }) => counts.new + counts.learning + counts.review > 0);
  if (due.length === 0 && !decks.some((d) => isDeckEnabled(data, d.id))) return null;

  return (
    <>
      <h2 className="section-title">{dict.library.dueTitle}</h2>
      {due.length === 0 ? (
        <p className="empty-state">{dict.library.dueEmpty}</p>
      ) : (
        <ul className="due-list">
          {due.map(({ deck, counts }) => (
            <li key={deck.id}>
              <Link href={`/decks/${deck.id}`} className="due-title">
                {deck.title}
              </Link>
              <SrsCounts counts={counts} t={dict.srs} />
              <Link href={`/decks/${deck.id}/review`} className="btn accent">
                {dict.srs.studyNow}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
