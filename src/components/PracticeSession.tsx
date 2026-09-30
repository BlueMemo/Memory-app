"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useReducer, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import {
  buildSteps,
  deckTestQuestion,
  fill,
  initReviewSession,
  initSession,
  knownCount,
  missedIds,
  orderCards,
  practiceReducer,
  type SessionState,
  type Step,
} from "@/lib/practice";
import { recordPracticeResult } from "@/lib/practiceResults";
import { renderBold, renderCapsHighlight } from "@/lib/rich-text";
import type { Card, Deck } from "@/lib/types";
import { ThoughtBubble } from "./Illustration";

/** How long learners get to invent their own object before a suggestion is offered. */
const SUGGESTION_DELAY_MS = 20_000;

type T = Dict["practice"];

export function PracticeSession({ deck, startInReview }: { deck: Deck; startInReview?: boolean }) {
  const t = useI18n().t.practice;
  const steps = useMemo(() => buildSteps(deck), [deck]);
  const [state, dispatch] = useReducer(
    practiceReducer,
    { deck, stepCount: steps.length, startInReview: !!startInReview },
    (arg) => (arg.startInReview ? initReviewSession(arg.deck, arg.stepCount) : initSession(arg.stepCount)),
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const recordedRound = useRef<number | null>(null);

  useEffect(() => {
    if (state.phase === "results" && recordedRound.current !== state.round) {
      recordedRound.current = state.round;
      recordPracticeResult(deck.id, knownCount(state), state.queue.length);
    }
  }, [state, deck.id]);

  const ordered = deck.kind === "ordered";
  const allIds = deck.cards.map((c) => c.id);
  const cardById = (id: string) => deck.cards.find((c) => c.id === id)!;
  const positionOf = (id: string) => deck.cards.findIndex((c) => c.id === id) + 1;

  const startRevision = (ids: string[]) => dispatch({ type: "startRevision", order: orderCards(deck, ids) });
  const startTest = () => dispatch({ type: "startTest", order: orderCards(deck, allIds) });
  const next = () => (state.step < steps.length - 1 ? dispatch({ type: "next" }) : startRevision(allIds));

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const go = e.key === " " || e.key === "Enter";
    // Handle the keys ourselves so a focused button isn't activated a second time.
    const handle = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    if (showInstructions) {
      if (go) handle(() => setShowInstructions(false));
      return;
    }
    switch (state.phase) {
      case "intro":
        if (go) handle(() => dispatch({ type: "begin" }));
        break;
      case "overview":
        if (go || e.key === "ArrowRight") handle(() => dispatch({ type: "startWalkthrough" }));
        break;
      case "walkthrough":
        if (go || e.key === "ArrowRight") handle(next);
        else if (e.key === "ArrowLeft") handle(() => dispatch({ type: "prev" }));
        break;
      case "revision":
      case "test":
        if (e.key === " ") handle(() => dispatch({ type: "flip" }));
        else if (e.key === "1") handle(() => dispatch({ type: "grade", grade: "again" }));
        else if (e.key === "2") handle(() => dispatch({ type: "grade", grade: "known" }));
        break;
    }
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const header = headerFor(state, ordered, t);
  const inFlow = state.phase !== "intro";

  return (
    <div className="practice">
      <div className="practice-top">
        <Link href={`/decks/${deck.id}`} className="exit-btn">
          {t.exit}
        </Link>
      </div>

      {showInstructions && (
        <InstructionsCard deck={deck} t={t} hint={t.clickToGoBack} onClick={() => setShowInstructions(false)} />
      )}

      <div className="practice-main" style={showInstructions ? { display: "none" } : undefined}>
        {header && (
          <header className="practice-header">
            {header.badge && <span className="badge">{header.badge}</span>}
            <h1>{header.title}</h1>
            <p>{header.text}</p>
          </header>
        )}
        {inFlow && <Progress deck={deck} state={state} steps={steps} />}

        {state.phase === "intro" && (
          <InstructionsCard deck={deck} t={t} hint={t.clickToBegin} onClick={() => dispatch({ type: "begin" })} />
        )}

        {state.phase === "overview" && (
          <>
            <div className="learn-wrap">
              <div className="face learn-card note deal">
                <span className="badge">{t.overviewBadge}</span>
                <p className="big">{deck.title}</p>
                <div className="learn-text">
                  <p>{t.overviewText}</p>
                  {ordered ? (
                    <ol className="overview-list">
                      {deck.cards.map((c) => (
                        <li key={c.id}>{c.answer}</li>
                      ))}
                    </ol>
                  ) : (
                    <ul className="overview-list">
                      {deck.cards.map((c) => (
                        <li key={c.id}>
                          {c.prompt}: <strong>{c.answer}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="controls">
              <button className="btn accent" onClick={() => dispatch({ type: "startWalkthrough" })}>
                {t.letsStart}
              </button>
            </div>
          </>
        )}

        {state.phase === "walkthrough" && (
          <>
            <WalkStep key={state.step} deck={deck} step={steps[state.step]} t={t} />
            <div className="controls">
              <button className="btn nav" onClick={() => dispatch({ type: "prev" })} disabled={state.step === 0}>
                {t.previous}
              </button>
              <button className="btn accent" onClick={next}>
                {nextLabel(steps[state.step], t)}
              </button>
            </div>
            <p className="keys">{t.walkKeys}</p>
          </>
        )}

        {(state.phase === "revision" || state.phase === "test") && (
          <>
            <FlipCard
              key={`${state.round}-${state.pos}`}
              deck={deck}
              card={cardById(state.queue[state.pos])}
              position={positionOf(state.queue[state.pos])}
              test={state.phase === "test"}
              flipped={state.flipped}
              onFlip={() => dispatch({ type: "flip" })}
              t={t}
            />
            <div className="controls">
              <button className="btn again" disabled={!state.flipped} onClick={() => dispatch({ type: "grade", grade: "again" })}>
                {state.phase === "test" ? t.missedIt : t.again}
              </button>
              <button className="btn good" disabled={!state.flipped} onClick={() => dispatch({ type: "grade", grade: "known" })}>
                {state.phase === "test" ? t.knewIt : t.gotIt}
              </button>
            </div>
            <p className="keys">{state.phase === "test" ? t.testKeys : t.revisionKeys}</p>
          </>
        )}

        {state.phase === "roundSummary" && (
          <section className="summary">
            <h2>{fill(t.roundTitle, { known: knownCount(state), total: state.queue.length })}</h2>
            <p>{t.roundText}</p>
            <div className="controls">
              <button className="btn again" onClick={() => startRevision(missedIds(state))}>
                {missedIds(state).length === 1 ? t.reviseMissedOne : fill(t.reviseMissedMany, { n: missedIds(state).length })}
              </button>
            </div>
          </section>
        )}

        {state.phase === "mastered" && (
          <section className="summary">
            <h2>{t.masteredTitle}</h2>
            <p>{t.masteredText}</p>
            <div className="summary-cta">
              <p>{renderBold(ordered ? t.testIntroOrdered : t.testIntroUnordered)}</p>
              <div className="controls">
                <button className="btn nav wide" onClick={() => startRevision(allIds)}>
                  {t.reviseAll}
                </button>
                <button className="btn accent" onClick={startTest}>
                  {t.takeTest}
                </button>
              </div>
              <button className="link-button" onClick={() => dispatch({ type: "startWalkthrough" })}>
                {t.restart}
              </button>
            </div>
          </section>
        )}

        {state.phase === "results" && (
          <Results deck={deck} state={state} t={t} cardById={cardById} positionOf={positionOf}
            onRevise={() => startRevision(allIds)} onRetest={startTest} />
        )}
      </div>

      {inFlow && !showInstructions && (
        <button className="help-btn" onClick={() => setShowInstructions(true)}>
          {t.instructionsButton}
        </button>
      )}
    </div>
  );
}

function headerFor(state: SessionState, ordered: boolean, t: T) {
  switch (state.phase) {
    case "walkthrough":
      return {
        badge: "",
        title: ordered ? t.walkOrderedTitle : t.walkUnorderedTitle,
        text: ordered ? t.walkOrderedText : t.walkUnorderedText,
      };
    case "revision":
    case "roundSummary":
    case "mastered":
      return {
        badge: t.reviseBadge,
        title: t.revisionTitle,
        text: ordered ? t.revisionOrderedText : t.revisionUnorderedText,
      };
    case "test":
      return { badge: t.testBadge, title: t.testTitle, text: t.testText };
    case "results":
      return { badge: t.testBadge, title: t.resultsTitle, text: t.resultsText };
    default:
      return null;
  }
}

function nextLabel(step: Step, t: T) {
  if (step.type === "revise") return t.startRevision;
  if (step.type === "note") return t.continue;
  return t.next;
}

function Progress({ deck, state, steps }: { deck: Deck; state: SessionState; steps: Step[] }) {
  let pips: string[];
  if (state.phase === "overview") {
    pips = deck.cards.map(() => "");
  } else if (state.phase === "walkthrough") {
    // Highlight the card being placed; instruction cards highlight the card that comes next.
    const step = steps[state.step];
    const current =
      step.type === "card" ? step.cardIndex : step.type === "note" ? deck.notes![step.noteIndex].beforeCard : deck.cards.length;
    pips = deck.cards.map((_, k) => (k < current ? "seen" : k === current ? "current" : ""));
  } else {
    const active = state.phase === "revision" || state.phase === "test";
    pips = state.queue.map((id, k) => state.grades[id] ?? (active && k === state.pos ? "current" : ""));
  }
  return (
    <div className="progress" aria-hidden="true">
      {pips.map((cls, k) => (
        <div key={k} className={`pip ${cls}`} />
      ))}
    </div>
  );
}

function InstructionsCard({ deck, t, hint, onClick }: { deck: Deck; t: T; hint: string; onClick: () => void }) {
  return (
    <div className="info-wrap">
      {/* Space/Enter are handled by the session's keyboard listener. */}
      <div className="info face deal" role="button" tabIndex={0} onClick={onClick}>
        <span className="badge">{t.instructionsBadge}</span>
        <h2>{t.instructionsTitle}</h2>
        <div className="instructions">
          {deck.instructions.map((p, i) => (
            <p key={i}>{renderBold(p)}</p>
          ))}
        </div>
        <span className="hint">{hint}</span>
      </div>
    </div>
  );
}

function WalkStep({ deck, step, t }: { deck: Deck; step: Step; t: T }) {
  if (step.type !== "card") {
    const note =
      step.type === "note"
        ? deck.notes![step.noteIndex]
        : {
            badge: t.reviseBadge,
            title: t.reviseTitle,
            body: deck.kind === "ordered" ? t.reviseBodyOrdered : t.reviseBodyUnordered,
          };
    return (
      <div className="learn-wrap">
        <div className="face learn-card note deal">
          <span className="badge">{note.badge}</span>
          <p className="big">{note.title}</p>
          <div className="learn-text">{renderBold(note.body)}</div>
        </div>
      </div>
    );
  }

  const card = deck.cards[step.cardIndex];
  const n = step.cardIndex + 1;
  const ordered = deck.kind === "ordered";
  const own = !card.object && !card.visualization;
  const showAnswer = deck.showAnswerInWalkthrough ?? true;
  const bubble = card.illustration;

  return (
    <div className={`learn-wrap${bubble ? " has-bubble" : ""}`}>
      {bubble && <ThoughtBubble name={bubble.name} side={bubble.side} />}
      <div className="face learn-card deal">
        <span className="badge">{ordered ? fill(t.stop, { n }) : card.prompt}</span>
        {!ordered && <CardImage src={card.promptImage} />}
        {own ? (
          <>
            <p className="big">{t.ownObject}</p>
            <CardImage src={card.answerImage} />
            <p className="learn-text muted">
              {fill(ordered ? t.ownObjectOrdered : t.ownObjectUnordered, { answer: card.answer })}
            </p>
            {card.suggestion && <SuggestionReveal suggestion={card.suggestion} t={t} />}
          </>
        ) : ordered ? (
          <>
            {card.visualization ? (
              <>
                <p className="big sentence">{renderCapsHighlight(card.visualization)}</p>
                <CardImage src={card.visualizationImage} />
              </>
            ) : (
              <>
                <p className="big">{card.object}</p>
                <p className="learn-text muted">{t.placeHint}</p>
              </>
            )}
            {showAnswer && (
              <>
                <AnswerLine card={card} />
                <CardImage src={card.answerImage} />
              </>
            )}
          </>
        ) : (
          <>
            <p className="big">{card.answer}</p>
            <CardImage src={card.answerImage} />
            {card.details && <p className="sub">{card.details}</p>}
            <p className="learn-text muted">{renderCapsHighlight(card.visualization ?? card.object ?? "")}</p>
            <CardImage src={card.visualizationImage} />
          </>
        )}
        {card.note && <CardNote note={card.note} t={t} />}
      </div>
    </div>
  );
}

function CardImage({ src }: { src?: string }) {
  if (!src) return null;
  return <img src={src} alt="" className="card-image" />;
}

/** For ordered decks: the object placed at a stop, or the memory queue sentence when there's no short object word. */
function ordinalAssociation(card: Card): ReactNode {
  if (card.object) return card.object;
  if (card.visualization) return renderCapsHighlight(card.visualization);
  return undefined;
}

function AnswerLine({ card }: { card: Card }) {
  return (
    <p className="sub">
      {card.answer}
      {card.details && <span className="details"> · {card.details}</span>}
    </p>
  );
}

function CardNote({ note, t }: { note: string; t: T }) {
  return (
    <p className="card-note">
      <strong>{t.note}:</strong> {note}
    </p>
  );
}

/** Offers a suggested object only after the learner has had time to think of their own. */
function SuggestionReveal({ suggestion, t }: { suggestion: string; t: T }) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAvailable(true), SUGGESTION_DELAY_MS);
    return () => clearTimeout(id);
  }, []);
  if (open) {
    return (
      <p className="suggestion">
        {t.suggestion} <strong>{suggestion}</strong>
      </p>
    );
  }
  if (!available) return null;
  return (
    <button className="suggest-btn" onClick={() => setOpen(true)}>
      {t.showSuggestion}
    </button>
  );
}

function FlipCard(props: {
  deck: Deck;
  card: Card;
  position: number;
  test: boolean;
  flipped: boolean;
  onFlip: () => void;
  t: T;
}) {
  const { deck, card, position: n, test, flipped, onFlip, t } = props;
  const ordered = deck.kind === "ordered";

  const frontTitle = ordered ? (test ? fill(t.number, { n }) : fill(t.stop, { n })) : card.prompt;
  const frontCue = test
    ? deckTestQuestion(deck, card, n) ?? (ordered ? fill(t.testDefaultOrdered, { n }) : t.testDefaultUnordered)
    : ordered
      ? t.revisionOrderedCue
      : t.revisionUnorderedCue;

  let back: { title: ReactNode; titleClass?: string; sub?: string; line?: ReactNode; image?: string };
  if (test) {
    back = {
      title: card.answer,
      sub: card.details,
      line: card.object
        ? fill(t.objectLine, { object: card.object })
        : card.visualization
          ? renderCapsHighlight(card.visualization)
          : card.suggestion && fill(t.ownObjectExample, { example: card.suggestion }),
      image: card.answerImage,
    };
  } else if (ordered) {
    const association = ordinalAssociation(card);
    back = {
      title: association ?? t.ownObject,
      titleClass: !card.object && card.visualization ? "sentence" : undefined,
      sub: fill(association ? t.standsFor : t.ownAssociation, { answer: card.answer }),
      line: !association && card.suggestion ? fill(t.forExample, { example: card.suggestion }) : undefined,
      image: card.visualizationImage ?? card.answerImage,
    };
  } else {
    back = {
      title: card.answer,
      sub: card.details,
      line: card.visualization && renderCapsHighlight(card.visualization),
      image: card.answerImage ?? card.visualizationImage,
    };
  }

  return (
    <div
      className="scene deal"
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={t.clickToFlip}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFlip();
      }}
    >
      <div className={`card${flipped ? " flipped" : ""}`}>
        <div className="face front" aria-hidden={flipped}>
          <p className="big">{frontTitle}</p>
          {!ordered && <CardImage src={card.promptImage} />}
          <p className="cue">{frontCue}</p>
          <p className="hint">{t.clickToFlip}</p>
        </div>
        <div className="face back" aria-hidden={!flipped}>
          <p className={`big${back.titleClass ? ` ${back.titleClass}` : ""}`}>{back.title}</p>
          <CardImage src={back.image} />
          {back.sub && <p className="sub">{back.sub}</p>}
          {back.line && <p className="learn-text muted">{back.line}</p>}
          {card.note && <CardNote note={card.note} t={t} />}
        </div>
      </div>
    </div>
  );
}

function Results(props: {
  deck: Deck;
  state: SessionState;
  t: T;
  cardById: (id: string) => Card;
  positionOf: (id: string) => number;
  onRevise: () => void;
  onRetest: () => void;
}) {
  const { deck, state, t, cardById, positionOf, onRevise, onRetest } = props;
  const ordered = deck.kind === "ordered";
  const known = knownCount(state);
  const pct = known / state.queue.length;
  const title = pct === 1 ? t.perfect : pct >= 0.7 ? t.great : pct >= 0.4 ? t.good : t.keepGoing;

  return (
    <section className="summary">
      <p className="score">
        {known} / {state.queue.length}
      </p>
      <h2>{title}</h2>
      <p>{pct === 1 ? t.perfectText : t.missedText}</p>
      <ul className="result-list">
        {state.queue.map((id) => {
          const card = cardById(id);
          const n = positionOf(id);
          const ok = state.grades[id] === "known";
          const association = ordinalAssociation(card);
          const reminder = ordered ? (
            <>
              {fill(t.stop, { n })}: {association ?? (card.suggestion ? fill(t.ownObjectExample, { example: card.suggestion }) : t.ownObject)}
            </>
          ) : (
            renderCapsHighlight(card.visualization ?? card.object ?? "")
          );
          return (
            <li key={id}>
              <span className={ok ? "mark-ok" : "mark-miss"}>{ok ? "✓" : "✗"}</span>
              <strong>{ordered ? `${n}. ${card.answer}` : `${card.prompt} → ${card.answer}`}</strong>
              <span className="muted">{ordered ? card.details : ""}</span>
              {!ok && <span className="reminder">{reminder}</span>}
            </li>
          );
        })}
      </ul>
      <div className="controls">
        <button className="btn nav wide" onClick={onRevise}>
          {t.backToRevision}
        </button>
        <button className="btn accent" onClick={onRetest}>
          {t.tryTestAgain}
        </button>
      </div>
      <Link href={`/decks/${deck.id}`} className="link-button">
        {t.backToDeck}
      </Link>
    </section>
  );
}
