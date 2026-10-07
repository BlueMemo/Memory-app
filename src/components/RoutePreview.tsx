"use client";

import { ArrowRight } from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { renderCapsHighlight } from "@/lib/rich-text";
import { Drawing } from "./Illustration";

// The landing demo's own route: its first three stops, straight from the deck (deck text is never translated).
const deck = officialDecks.find((d) => d.id === "largest-countries")!;
const STOPS = deck.cards.slice(0, 3);

/**
 * The landing hero's visual: a real, clickable preview of a memory route rather than a stock photo or a
 * mock screenshot. Each stop shows the deck's drawing (or, where the deck has none, asks you to picture it),
 * the scene and what it stands for.
 */
export function RoutePreview() {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const card = STOPS[index];
  const last = index === STOPS.length - 1;

  return (
    <figure className="route-preview" aria-label={t.landing.previewLabel}>
      <ol className="route-stops">
        {STOPS.map((stop, i) => (
          <li key={stop.id}>
            <button type="button" aria-current={i === index ? "step" : undefined} onClick={() => setIndex(i)}>
              <span className="route-stop-n">{i + 1}</span>
              <span className="route-stop-name">{stop.object ?? stop.answer}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* Keyed by stop, so each one plays its entrance; announced politely to screen readers. */}
      <div className="route-scene" key={card.id} aria-live="polite">
        <p className="route-scene-stop">{fill(t.practice.stop, { n: index + 1 })}</p>
        <div className="route-plate">
          {card.illustration ? (
            <Drawing name={card.illustration.name} className="route-drawing" />
          ) : (
            <p className="route-imagine">
              <strong>{card.object}</strong>
              <span>{t.landing.previewImagine}</span>
            </p>
          )}
        </div>
        {card.visualization && <p className="route-visual">{renderCapsHighlight(card.visualization)}</p>}
        <p className="route-answer">
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
          {fill(t.practice.standsFor, { answer: card.answer })}
        </p>
      </div>

      <button type="button" className="btn nav route-next" onClick={() => setIndex(last ? 0 : index + 1)}>
        {last ? t.landing.previewAgain : t.landing.previewNext}
      </button>
    </figure>
  );
}
