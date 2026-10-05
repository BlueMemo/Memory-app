"use client";

import Link from "next/link";
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

/** Total cards, due now, learned, never seen, and new cards today (within the deck's daily limit). */
function DeckOverview({ deck }: { deck: Deck }) {
  const t = useI18n().t.deck;
  const srs = useSrsData();
  const status = useSrsStatus();
  const now = useNow();
  let dueNow = 0;
  let learned = 0;
  let unseen = 0;
  for (const card of deck.cards) {
    const stored = srs.cards[cardKey(deck.id, card.id)];
    if (!stored || stored.state === State.New) {
      unseen++;
      continue;
    }
    if (stored.state === State.Review) learned++;
    if (new Date(stored.due).getTime() <= now.getTime()) dueNow++;
  }
  const newToday = deckCounts({ deckId: deck.id, cardIds: deck.cards.map((c) => c.id), cards: srs.cards, logs: srs.logs, settings: srs.settings, now }).new;
  const loading = status === "loading";
  const tiles: [string, number][] = [
    [t.overviewTotal, deck.cards.length],
    [t.overviewDue, dueNow],
    [t.overviewLearned, learned],
    [t.overviewUnseen, unseen],
    [t.overviewNewToday, newToday],
  ];
  return (
    <div className="stat-grid deck-overview">
      {tiles.map(([label, value]) => (
        <div key={label} className="stat-tile">
          <div className="stat-value">{loading ? "–" : value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
