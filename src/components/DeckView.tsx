"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, useI18n } from "@/i18n";
import { removeDeckOverride, useDeckOverrides } from "@/lib/deckOverrides";
import { isSharedDeck } from "@/lib/editableDecks";
import { useSavedDeckIds } from "@/lib/library";
import { fill } from "@/lib/practice";
import { cardKey, deckCounts, State } from "@/lib/srs/core";
import { isDeckEnabled, setDeckSrsEnabled, useSrsData, useSrsStatus } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { DeckCardsTable } from "./DeckCardsTable";
import { GearIcon } from "./GearIcon";
import { isTyping } from "./PracticeSession";
import { SaveDeckButton } from "./SaveDeckButton";

/**
 * A deck's page: an overview of where its cards stand, "Study now" (spaced repetition), its settings,
 * and Browse (every card, searchable). Editing, sharing, export and deleting live in the deck settings.
 */
export function DeckView({ deck }: { deck: Deck }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const shared = isSharedDeck(deck.id);
  const saved = useSavedDeckIds().includes(deck.id);
  const overrides = useDeckOverrides();
  const edited = shared && overrides[deck.id] !== undefined;
  const editable = !shared || saved;
  const backHref = shared && !saved ? "/discover" : "/library";
  const backLabel = shared && !saved ? t.deck.back : t.deck.backToLibrary;
  const srs = useSrsData();

  const study = async () => {
    // Studying a deck is spaced repetition; switch it on the first time.
    if (!isDeckEnabled(srs, deck.id)) await setDeckSrsEnabled(deck.id, true);
    router.push(`/decks/${deck.id}/review`);
  };

  // A adds a card to this deck, as in the Library (not while typing, not with modifier keys). Decks you
  // can't edit yet (an official deck you haven't saved) have nowhere to put it.
  const addHref = `/library/add?deck=${encodeURIComponent(deck.id)}&back=deck`;
  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      if (e.key.toLowerCase() === "a") router.push(addHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, addHref, router]);

  return (
    <main className="page narrow">
      <Link href={backHref} className="link-muted">
        {backLabel}
      </Link>

      <div className="tags deck-tags">
        {deck.official && <span className="tag accent">{t.decks.official}</span>}
        {edited && (
          <span className="tag" title={t.deck.editedHint}>
            {t.decks.edited}
          </span>
        )}
        {deck.language !== lang && (
          <span className="tag">{fill(t.deck.contentLanguage, { lang: dictionaries[deck.language].languageName })}</span>
        )}
      </div>
      <h1 className="deck-title">{deck.title}</h1>
      {deck.description && <p className="deck-description">{deck.description}</p>}

      <DeckOverview deck={deck} />

      <div className="deck-actions">
        <button type="button" className="btn accent big-btn" onClick={() => void study()}>
          {t.deck.studyNow}
        </button>
        {editable && (
          <Link href={addHref} className="btn nav">
            {t.library.addCard} <kbd>A</kbd>
          </Link>
        )}
        <Link href={`/library/settings?deck=${encodeURIComponent(deck.id)}`} className="btn nav icon-btn">
          <GearIcon /> {t.deck.deckSettings}
        </Link>
        {shared && !saved && <SaveDeckButton deckId={deck.id} />}
      </div>
      {edited && (
        <p className="fine-print">
          {t.deck.editedHint}{" "}
          <button className="link-button inline" onClick={() => window.confirm(t.deck.resetConfirm) && removeDeckOverride(deck.id)}>
            {t.deck.resetToOriginal}
          </button>
        </p>
      )}

      <DeckCardsTable deck={deck} editable={editable} />
    </main>
  );
}

/**
 * The deck at a glance: total cards; today's learning / due / new counts in the same colours and order as
 * while studying; then cards learned and never seen.
 */
function DeckOverview({ deck }: { deck: Deck }) {
  const { t: dict } = useI18n();
  const t = dict.deck;
  const srs = useSrsData();
  const status = useSrsStatus();
  const now = useNow();
  let learned = 0;
  let unseen = 0;
  for (const card of deck.cards) {
    const stored = srs.cards[cardKey(deck.id, card.id)];
    if (!stored || stored.state === State.New) unseen++;
    else if (stored.state === State.Review) learned++;
  }
  const today = deckCounts({ deckId: deck.id, cardIds: deck.cards.map((c) => c.id), cards: srs.cards, logs: srs.logs, settings: srs.settings, now });
  const loading = status === "loading";
  const tiles: [string, number, string?][] = [
    [t.overviewTotal, deck.cards.length],
    [dict.srs.learningCount, today.learning, "srs-count-learning"],
    [dict.srs.reviewCount, today.review, "srs-count-review"],
    [dict.srs.newCount, today.new, "srs-count-new"],
    [t.overviewLearned, learned],
    [t.overviewUnseen, unseen],
  ];
  return (
    <div className="stat-grid deck-overview">
      {tiles.map(([label, value, colour]) => (
        <div key={label} className={`stat-tile${colour ? ` ${colour}` : ""}`}>
          <div className="stat-value">{loading ? "–" : value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
