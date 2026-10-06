"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import {
  cardKey,
  deckCounts,
  formatInterval,
  deadlineFor,
  makeScheduler,
  settingsForDeck,
  pickNext,
  previewDue,
  Rating,
  type Grade,
  type QueueInput,
} from "@/lib/srs/core";
import {
  buryCard,
  isDeckEnabled,
  reviewCard,
  setDeckSrsEnabled,
  undoSrsChange,
  useSrsData,
  useSrsSignedIn,
  useSrsStatus,
  type SrsChange,
} from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { CardDialog } from "./CardForm";
import { Celebration } from "./Celebration";
import { FlipCard, isTyping, StudyBar } from "./PracticeSession";

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
  // Answers and buries this session, newest last, for U (undo); the open card dialog; the shown hint.
  const [history, setHistory] = useState<SrsChange[]>([]);
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
    const settings = settingsForDeck(data.settings, deck.id);
    const due = previewDue(makeScheduler(settings, { fuzz: false }), stored, now, deadlineFor(settings.examDate, card?.dueBy));
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
    const change = reviewCard(deck.id, current.cardId, grade, at, card?.dueBy);
    setHistory((h) => [...h, change]);
    setFlipped(false);
    setNow(at);
  };
  const bury = () => {
    if (!current) return;
    const at = new Date();
    const change = buryCard(deck.id, current.cardId, at);
    setHistory((h) => [...h, change]);
    setFlipped(false);
    setNow(at);
  };
  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    undoSrsChange(last);
    setNow(new Date());
    setFlipped(false);
  };
  const hintKey = current ? `${current.cardId}-${stored?.reps ?? 0}` : null;

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || dialog || isTyping(e)) return;
    const handle = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    const key = e.key.toLowerCase();
    if (key === "u" && history.length) return handle(undo);
    if (!current) return;
    if (e.key === "?") return handle(() => setShortcutsOpen((o) => !o));
    if (e.key === "Escape" && shortcutsOpen) return handle(() => setShortcutsOpen(false));
    if (e.key === "-" || e.key === "−") return handle(bury);
    if (key === "a") return handle(() => setDialog("add"));
    if (key === "e") return handle(() => setDialog("edit"));
    if (e.key === "Tab" && !e.shiftKey && !flipped) return handle(() => setHintFor(hintKey));
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
      <span className="session-label">{deck.title}</span>
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
              showHint={hintFor === hintKey}
              t={dict.practice}
            />
            <StudyBar
              t={dict.study}
              left={<SrsCounts counts={counts} active={current.queue} t={t} />}
              canUndo={history.length > 0}
              onUndo={undo}
              onBury={bury}
              onAdd={() => setDialog("add")}
              onEdit={() => setDialog("edit")}
              shortcutsOpen={shortcutsOpen}
              onToggleShortcuts={() => setShortcutsOpen((o) => !o)}
              shortcuts={[
                [dict.study.keySpace, dict.study.showAnswer],
                ["1", t.again],
                ["2", t.hard],
                [`3 / ${dict.study.keySpace}`, t.good],
                ["4", t.easy],
                ["Tab", dict.study.hint],
                ["U", dict.study.undo],
                ["−", dict.study.bury],
                ["A", dict.study.addCard],
                ["E", dict.study.editCard],
                ["?", dict.study.shortcuts],
              ]}
            >
              {flipped && labels ? (
                BUTTONS.map((b) => (
                  <button key={b.grade} className={`btn srs-${b.key}`} onClick={() => answer(b.grade)}>
                    <span className="srs-interval">{labels[b.grade]}</span>
                    {t[b.key]}
                  </button>
                ))
              ) : (
                <>
                  {hintFor !== hintKey && (
                    <button type="button" className="btn nav" onClick={() => setHintFor(hintKey)}>
                      {dict.study.hint}
                    </button>
                  )}
                  <button type="button" className="btn accent" onClick={() => setFlipped(true)}>
                    {dict.study.showAnswer}
                  </button>
                </>
              )}
            </StudyBar>
            {dialog && <CardDialog deckId={deck.id} card={dialog === "edit" ? card : undefined} onClose={() => setDialog(null)} />}
          </>
        ) : (
          <section className="summary">
            {/* Finishing the due cards in this session earns a celebration; opening an already finished deck doesn't. */}
            {next.kind !== "wait" && history.length > 0 ? <Celebration /> : <h2>{next.kind === "wait" ? t.waitingTitle : t.finishedTitle}</h2>}
            <p>
              {next.kind === "wait"
                ? fill(t.waitingText, { time: formatInterval(next.until.getTime() - now.getTime(), t.units) })
                : t.finishedText}
            </p>
            <Link href={`/decks/${deck.id}`} className="btn nav wide">
              {t.backToDeck}
            </Link>
            {history.length > 0 && (
              <p>
                <button type="button" className="link-button" onClick={undo}>
                  {dict.study.undo}
                </button>
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** The three numbers: learning (red), due reviews (green), new (blue). */
export function SrsCounts({
  counts,
  active,
  t,
}: {
  counts: { new: number; learning: number; review: number };
  active?: "new" | "learning" | "review";
  t: { newCount: string; learningCount: string; reviewCount: string };
}) {
  // Same order everywhere: learning, then due reviews, then new (the order cards are shown in).
  const items = [
    { key: "learning", label: t.learningCount, n: counts.learning },
    { key: "review", label: t.reviewCount, n: counts.review },
    { key: "new", label: t.newCount, n: counts.new },
  ] as const;
  return (
    <p className="srs-counts">
      {items.map((i) => (
        <span key={i.key} className={`srs-count srs-count-${i.key}${active === i.key ? " active" : ""}`}>
          {i.label}: <strong>{i.n}</strong>
        </span>
      ))}
    </p>
  );
}
