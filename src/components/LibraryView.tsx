"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { useSavedDecks } from "@/lib/editableDecks";
import { useOnboarding } from "@/lib/onboarding";
import { fill } from "@/lib/practice";
import { cardKey, deckCounts } from "@/lib/srs/core";
import { isDeckEnabled, setDeckSrsEnabled, useSrsData, type SrsData } from "@/lib/srs/store";
import { usePreferences, type LibrarySort } from "@/lib/preferences";
import { useNow } from "@/lib/useNow";
import { useUser } from "@/lib/supabase/useUser";
import { useUserDecks } from "@/lib/userDecks";
import type { Deck } from "@/lib/types";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GearIcon } from "./GearIcon";
import { PageTabs } from "./PageTabs";
import { isTyping } from "./PracticeSession";
import { ImportGuestDataPrompt } from "./ImportGuestDataPrompt";

/** The Library's welcome line, tied to what the learner said they'll study (the introduction), if anything. */
function useWelcome(fallback: string): string {
  const intro = useI18n().t.onboarding;
  const { goal, language } = useOnboarding();
  if (goal === "languages") {
    const word = language ? intro.languageWords[language] : "";
    return word ? fill(intro.welcome.languages, { language: word }) : intro.welcome.languagesAny;
  }
  return goal ? intro.welcome[goal] : fallback;
}

export function LibraryView() {
  const t = useI18n().t.library;
  const welcome = useWelcome(t.lead);
  const { user } = useUser();
  const savedDecks = useSavedDecks();
  const userDecks = useUserDecks();
  const prefs = usePreferences();
  const srs = useSrsData();
  const now = useNow();
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
          <p>{welcome}</p>
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
              withCreate={section.withCreate}
              action={actions}
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

/** One group of decks as a list: Study now, title, card count and today's counts in aligned columns. */
function DeckCollection(props: {
  decks: Deck[];
  withCreate: boolean;
  action: (deck: Deck) => ReactNode;
  srs: SrsData;
}) {
  const { t: dict } = useI18n();
  const now = useNow();
  const router = useRouter();
  // "Study now" straight from the list, as on the deck page: switch spaced repetition on if needed, then review.
  const study = async (deck: Deck) => {
    if (!isDeckEnabled(props.srs, deck.id)) await setDeckSrsEnabled(deck.id, true);
    router.push(`/decks/${deck.id}/review`);
  };
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
            <button type="button" className="btn accent deck-list-study" onClick={() => void study(deck)}>
              <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                <path d="M1 1.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L1.9.7A.6.6 0 0 0 1 1.2z" fill="currentColor" />
              </svg>
              {dict.deck.studyNow}
            </button>
            <Link href={`/decks/${deck.id}`} className="deck-list-title">
              {deck.title}
            </Link>
            <span className="deck-list-num deck-list-cards">
              <span className="visually-hidden">{dict.library.colCards}: </span>
              {deck.cards.length}
            </span>
            {/* Learning, due, new: only the numbers, right-aligned under the header's labels; zeros stay grey.
                The header row is hidden from screen readers, so each number carries its label invisibly. */}
            {(["learning", "review", "new"] as const).map((key) => (
              <span key={key} className={`deck-list-num deck-list-count srs-count-${key}${!due || due[key] === 0 ? " zero" : ""}`}>
                <span className="visually-hidden">{dict.srs[`${key}Count`]}: </span>
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
