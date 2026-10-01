"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { deckCounts } from "@/lib/srs/core";
import { isDeckEnabled, setDeckSrsEnabled, useSrsData, useSrsStatus } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { SrsCounts } from "./ReviewSession";

/** The spaced repetition box on a deck page: on/off switch, today's counts and "Study now". */
export function SrsDeckPanel({ deck }: { deck: Deck }) {
  const t = useI18n().t.srs;
  const data = useSrsData();
  const status = useSrsStatus();
  const now = useNow();
  if (status === "loading") return null;

  const enabled = isDeckEnabled(data, deck.id);
  const counts = deckCounts({
    deckId: deck.id,
    cardIds: deck.cards.map((c) => c.id),
    cards: data.cards,
    logs: data.logs,
    settings: data.settings,
    now,
  });
  const anyDue = counts.new + counts.learning + counts.review > 0;

  return (
    <section className={`srs-panel${enabled ? " on" : ""}`}>
      <div className="srs-panel-head">
        <h2>{t.panelTitle}</h2>
        <button
          role="switch"
          aria-checked={enabled}
          className={`switch${enabled ? " on" : ""}`}
          onClick={() => setDeckSrsEnabled(deck.id, !enabled)}
          title={enabled ? t.turnOff : t.turnOn}
        >
          <span className="switch-knob" />
          <span className="visually-hidden">{enabled ? t.turnOff : t.turnOn}</span>
        </button>
      </div>
      {enabled ? (
        <div className="srs-panel-body">
          <SrsCounts counts={counts} t={t} />
          {anyDue ? (
            <Link href={`/decks/${deck.id}/review`} className="btn accent">
              {t.studyNow}
            </Link>
          ) : (
            <span className="muted">{t.nothingDue}</span>
          )}
          <Link href="/settings" className="link-muted srs-options">
            {t.settingsLink}
          </Link>
        </div>
      ) : (
        <p className="muted">{t.panelOff}</p>
      )}
    </section>
  );
}
