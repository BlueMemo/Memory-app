"use client";

import { ArrowRight, Play } from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { toggleSavedDeck, useSavedDeckIds } from "@/lib/library";
import { fill } from "@/lib/practice";
import { renderCapsHighlight } from "@/lib/rich-text";
import { Drawing } from "./Illustration";

// The landing demo's own route, straight from the deck (deck text is never translated).
const deck = officialDecks.find((d) => d.id === "largest-countries")!;
const FIRST = deck.cards[0];

/**
 * The landing hero's visual: the first stop of a real memory route (its drawing, the scene and what it
 * stands for), and below it a button to practise the whole deck, which also saves it to the library.
 */
export function RoutePreview() {
  const { t } = useI18n();
  const router = useRouter();
  const saved = useSavedDeckIds().includes(deck.id);
  const [busy, setBusy] = useState(false);

  const practise = async () => {
    setBusy(true);
    if (!saved) await toggleSavedDeck(deck.id);
    router.push(`/decks/${deck.id}/practice`);
  };

  return (
    <figure className="route-preview" aria-label={t.landing.previewLabel}>
      <p className="route-deck">
        <span>{deck.title}</span>
        <span className="route-deck-count">{fill(t.decks.cardCount, { n: deck.cards.length })}</span>
      </p>
      <div className="route-scene">
        <p className="route-scene-stop">{fill(t.practice.stop, { n: 1 })}</p>
        <div className="route-plate">
          {FIRST.illustration ? (
            <Drawing name={FIRST.illustration.name} className="route-drawing" />
          ) : (
            <p className="route-imagine">
              <strong>{FIRST.object}</strong>
              <span>{t.landing.previewImagine}</span>
            </p>
          )}
        </div>
        {FIRST.visualization && <p className="route-visual">{renderCapsHighlight(FIRST.visualization)}</p>}
        <p className="route-answer">
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
          {fill(t.practice.standsFor, { answer: FIRST.answer })}
        </p>
      </div>

      <button type="button" className="btn accent route-practise" disabled={busy} onClick={() => void practise()}>
        <Play size={16} weight="fill" aria-hidden="true" />
        {t.landing.practiseDeck}
      </button>
      <p className="route-practise-note">{saved ? t.landing.practiseInLibrary : t.landing.practiseAdds}</p>
    </figure>
  );
}
