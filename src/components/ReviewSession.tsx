"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import {
  cardKey,
  deckCounts,
  formatInterval,
  makeScheduler,
  pickNext,
  previewDue,
  Rating,
  type Grade,
  type QueueInput,
} from "@/lib/srs/core";
import { isDeckEnabled, reviewCard, setDeckSrsEnabled, useSrsData, useSrsSignedIn, useSrsStatus } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { FlipCard } from "./PracticeSession";

const BUTTONS: { grade: Grade; key: "again" | "hard" | "good" | "easy" }[] = [
  { grade: Rating.Again, key: "again" },
  { grade: Rating.Hard, key: "hard" },
  { grade: Rating.Good, key: "good" },
  { grade: Rating.Easy, key: "easy" },
];

/** Anki-style review of one deck: due learning cards, then reviews, then new cards, graded Again/Hard/Good/Easy. */
export function ReviewSession({ deck }: { deck: Deck }) {
  const { t: dict } = useI18n();
  const t = dict.srs;
  const data = useSrsData();
  const status = useSrsStatus();
  const signedIn = useSrsSignedIn();
  // The queue is computed for this moment; it advances when a card is answered or a waiting card comes due.
  const [now, setNow] = useState(() => new Date());
  const [flipped, setFlipped] = useState(false);

  const input: QueueInput = {
    deckId: deck.id,
    cardIds: deck.cards.map((c) => c.id),
    cards: data.cards,
    logs: data.logs,
    settings: data.settings,
    now,
  };
  const next = pickNext(input);
  const counts = deckCounts(input);
  const current = next.kind === "card" ? next : null;
  const card = current ? deck.cards.find((c) => c.id === current.cardId) : undefined;
  const stored = current ? data.cards[cardKey(deck.id, current.cardId)] : undefined;

  // Button labels show the unfuzzed interval, like Anki; the actual schedule adds a little fuzz.
  let labels: Record<number, string> | null = null;
  if (current) {
    const due = previewDue(makeScheduler(data.settings, { fuzz: false }), stored, now);
    labels = Object.fromEntries(BUTTONS.map((b) => [b.grade, formatInterval(due[b.grade].getTime() - now.getTime(), t.units)]));
  }

  const waitUntil = next.kind === "wait" ? next.until.getTime() : null;
  useEffect(() => {
    if (waitUntil === null) return;
    const id = setTimeout(() => setNow(new Date()), Math.max(0, waitUntil - Date.now()) + 250);
    return () => clearTimeout(id);
  }, [waitUntil]);

  const answer = (grade: Grade) => {
    if (!current || !flipped) return;
    const at = new Date();
    reviewCard(deck.id, current.cardId, grade, at);
    setFlipped(false);
    setNow(at);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !current) return;
    const handle = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    if (!flipped) {
      if (e.key === " " || e.key === "Enter") handle(() => setFlipped(true));
      return;
    }
    // As in Anki, Space and Enter answer "Good" once the answer is showing.
    if (e.key === " " || e.key === "Enter") handle(() => answer(Rating.Good));
    else if (["1", "2", "3", "4"].includes(e.key)) handle(() => answer(Number(e.key) as Grade));
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const exit = (
    <div className="practice-top">
      <Link href={`/decks/${deck.id}`} className="exit-btn">
        {dict.practice.exit}
      </Link>
    </div>
  );

  if (status === "loading") return <div className="practice">{exit}</div>;

  if (!isDeckEnabled(data, deck.id)) {
    return (
      <div className="practice">
        {exit}
        <section className="summary">
          <h2>{t.notEnabledTitle}</h2>
          <p>{t.notEnabledText}</p>
          <div className="controls">
            <button className="btn accent" onClick={() => setDeckSrsEnabled(deck.id, true)}>
              {t.turnOn}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="practice">
      {exit}
      <div className="practice-main">
        <header className="practice-header">
          <span className="badge">{t.reviewBadge}</span>
          <h1>{deck.title}</h1>
          <SrsCounts counts={counts} active={current?.queue} t={t} />
        </header>

        {status === "error" && <p className="notice error">{signedIn ? t.saveErrorRemote : t.saveErrorLocal}</p>}

        {card && current ? (
          <>
            <FlipCard
              key={`${current.cardId}-${stored?.reps ?? 0}`}
              deck={deck}
              card={card}
              position={deck.cards.indexOf(card) + 1}
              test
              flipped={flipped}
              onFlip={() => setFlipped(true)}
              t={dict.practice}
            />
            {flipped && labels ? (
              <div className="controls srs-answers">
                {BUTTONS.map((b) => (
                  <button key={b.grade} className={`btn srs-${b.key}`} onClick={() => answer(b.grade)}>
                    <span className="srs-interval">{labels[b.grade]}</span>
                    {t[b.key]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="controls">
                <button className="btn accent wide" onClick={() => setFlipped(true)}>
                  {t.showAnswer}
                </button>
              </div>
            )}
            <p className="keys">{t.keys}</p>
          </>
        ) : (
          <section className="summary">
            <h2>{next.kind === "wait" ? t.waitingTitle : t.finishedTitle}</h2>
            <p>
              {next.kind === "wait"
                ? fill(t.waitingText, { time: formatInterval(next.until.getTime() - now.getTime(), t.units) })
                : t.finishedText}
            </p>
            <Link href={`/decks/${deck.id}`} className="btn nav wide">
              {t.backToDeck}
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

/** Anki's three numbers: new (blue), learning (red), due reviews (green). */
export function SrsCounts({
  counts,
  active,
  t,
}: {
  counts: { new: number; learning: number; review: number };
  active?: "new" | "learning" | "review";
  t: { newCount: string; learningCount: string; reviewCount: string };
}) {
  const items = [
    { key: "new", label: t.newCount, n: counts.new },
    { key: "learning", label: t.learningCount, n: counts.learning },
    { key: "review", label: t.reviewCount, n: counts.review },
  ] as const;
  return (
    <p className="srs-counts">
      {items.map((i) => (
        <span key={i.key} className={`srs-count srs-count-${i.key}${active === i.key ? " active" : ""}`}>
          <strong>{i.n}</strong> {i.label}
        </span>
      ))}
    </p>
  );
}
