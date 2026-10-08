"use client";

import { X } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useReducer, useState, type MouseEvent, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import {
  buildSteps,
  deckTestQuestion,
  fill,
  initSession,
  knownCount,
  missedIds,
  orderCards,
  practiceReducer,
  type SessionState,
  type Step,
} from "@/lib/practice";
import { setOnboarding, TUTORIAL_DECK_ID, useOnboarding } from "@/lib/onboarding";
import { recordPracticeResult } from "@/lib/practiceResults";
import { renderBold, renderCapsHighlight } from "@/lib/rich-text";
import type { Card, Deck } from "@/lib/types";
import { CardDialog } from "./CardForm";
import { ThoughtBubble } from "./Illustration";

/** How long learners get to invent their own object before a suggestion is offered. */
const SUGGESTION_DELAY_MS = 20_000;

type T = Dict["practice"];
type StudyT = Dict["study"];

/**
 * The memory cue offered as a hint before the answer (Tab): in tests, the association that leads to the
 * answer; in revision, the scene. When the cue would give away what's being asked (an ordered route's
 * object), or there is none, it's the answer's first letter instead.
 */
export function memoryHint(deck: Deck, card: Card, test: boolean, t: StudyT): ReactNode {
  const firstLetter = (word: string) => fill(t.firstLetter, { letter: word.trim().charAt(0).toUpperCase() });
  if (test) {
    if (card.object) return card.object;
    if (card.visualization) return renderCapsHighlight(card.visualization);
    return card.suggestion ?? firstLetter(card.answer);
  }
  if (deck.kind === "ordered") return firstLetter(card.object ?? card.suggestion ?? card.answer);
  return card.visualization ? renderCapsHighlight(card.visualization) : firstLetter(card.answer);
}

/** Keys typed into a form field (e.g. the card dialog) must not trigger study shortcuts. */
export const isTyping = (e: KeyboardEvent) =>
  e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));

const focusedIn = (e: KeyboardEvent, selector: string) => e.target instanceof Element && !!e.target.closest(selector);

/**
 * Space or Enter on a focused button or link is that control's own click, so study shortcuts leave it alone.
 * Only keyboard users end up there: the study screen's buttons don't take focus when clicked (`noMouseFocus`).
 */
export const onFocusedControl = (e: KeyboardEvent) => focusedIn(e, "a, button, summary, select");

/**
 * Tab shows the hint only while no control has focus: once a keyboard user is moving between buttons, Tab
 * moves on as usual (otherwise the bar's buttons could never be reached).
 */
export const tabForHint = (e: KeyboardEvent) =>
  e.key === "Tab" && !e.shiftKey && !focusedIn(e, "a, button, summary, select, [tabindex]:not([tabindex='-1'])");

/**
 * On a container of study buttons: a mouse click doesn't move focus onto the button, so the next Space still
 * shows the answer instead of pressing that button again (the click itself works as usual).
 */
const noMouseFocus = (e: MouseEvent) => e.preventDefault();

/** The guided technique practice for one deck (the landing page's demo): walkthrough → revision → test. */
export function PracticeSession({ deck }: { deck: Deck }) {
  const { t: dict } = useI18n();
  const t = dict.practice;
  const steps = useMemo(() => buildSteps(deck), [deck]);
  const [state, dispatch] = useReducer(practiceReducer, steps.length, initSession);
  const [showInstructions, setShowInstructions] = useState(false);
  const recordedRound = useRef<number | null>(null);
  // Earlier states, so U can undo grades; the open card dialog; and which card's hint is showing.
  const [history, setHistory] = useState<SessionState[]>([]);
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const cardKey = `${state.round}-${state.pos}`;
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const studying = state.phase === "revision" || state.phase === "test";

  const grade = (g: "again" | "known") => {
    if (!state.flipped) return;
    setHistory((h) => [...h, state]);
    dispatch({ type: "grade", grade: g });
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    setHintFor(null);
    dispatch({ type: "restore", state: previous });
  };

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
    if (e.ctrlKey || e.metaKey || e.altKey || dialog || isTyping(e)) return;
    const go = e.key === " " || e.key === "Enter";
    if (go && onFocusedControl(e)) return;
    // Handle the keys ourselves so a focused button isn't activated a second time.
    const handle = (fn: () => void) => {
      e.preventDefault();
      fn();
    };
    if (showInstructions) {
      if (go) handle(() => setShowInstructions(false));
      return;
    }
    if (e.key.toLowerCase() === "u" && history.length) return handle(undo);
    if (studying && e.key === "?") return handle(() => setShortcutsOpen((o) => !o));
    if (studying && e.key === "Escape" && shortcutsOpen) return handle(() => setShortcutsOpen(false));
    if (studying) {
      const key = e.key.toLowerCase();
      if (key === "a") return handle(() => setDialog("add"));
      if (key === "e") return handle(() => setDialog("edit"));
      if (tabForHint(e) && !state.flipped && hintFor !== cardKey) return handle(() => setHintFor(cardKey));
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
        else if (e.key === "1") handle(() => grade("again"));
        else if (e.key === "2") handle(() => grade("known"));
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
  // The introduction's tutorial (/start): no site header (SiteHeader hides it), just a big ✕ in the corner.
  const onboarding = useOnboarding();
  const tutorial = onboarding.tutorialPending && deck.id === TUTORIAL_DECK_ID;

  return (
    <main className={`practice${tutorial ? " tutorial" : ""}`}>
      {/* While the instructions are open, they're the only thing on screen: no exit (the card closes them). */}
      {showInstructions ? null : tutorial ? (
        <Link
          href="/"
          className="tutorial-close"
          aria-label={dict.onboarding.close}
          title={dict.onboarding.close}
          onClick={() => setOnboarding({ tutorialPending: false, completedAt: new Date().toISOString() })}
        >
          <X size={26} weight="bold" aria-hidden="true" />
        </Link>
      ) : (
        <div className="practice-top">
          <Link href={`/decks/${deck.id}`} className="exit-btn">
            {t.exit}
          </Link>
        </div>
      )}

      {showInstructions && (
        <InstructionsCard deck={deck} t={t} hint={t.clickToGoBack} onClick={() => setShowInstructions(false)} />
      )}

      <div className="practice-main" style={showInstructions ? { display: "none" } : undefined}>
        {header && (
          <header className={`practice-header${studying ? " compact" : ""}`}>
            {header.badge && <span className="badge">{header.badge}</span>}
            {/* While answering cards, only the badge and progress show: the card itself is the focus. */}
            {!studying && <h1>{header.title}</h1>}
            {!studying && <p>{header.text}</p>}
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
            <div className="controls" onMouseDown={noMouseFocus}>
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

        {studying && deck.cards.some((c) => c.id === state.queue[state.pos]) && (
          <>
            <FlipCard
              key={cardKey}
              deck={deck}
              card={cardById(state.queue[state.pos])}
              position={positionOf(state.queue[state.pos])}
              test={state.phase === "test"}
              flipped={state.flipped}
              onFlip={() => dispatch({ type: "flip" })}
              showHint={hintFor === cardKey}
              t={t}
            />
            <StudyBar
              t={dict.study}
              canUndo={history.length > 0}
              onUndo={undo}
              onAdd={() => setDialog("add")}
              onEdit={() => setDialog("edit")}
              shortcutsOpen={shortcutsOpen}
              onToggleShortcuts={() => setShortcutsOpen((o) => !o)}
              shortcuts={[
                [dict.study.keySpace, dict.study.showAnswer],
                ["1", state.phase === "test" ? t.missedIt : t.again],
                ["2", state.phase === "test" ? t.knewIt : t.gotIt],
                ["Tab", dict.study.hint],
                ["U", dict.study.undo],
                ["A", dict.study.addCard],
                ["E", dict.study.editCard],
                ["?", dict.study.shortcuts],
              ]}
            >
              {state.flipped ? (
                <>
                  <button className="btn again" onClick={() => grade("again")}>
                    {state.phase === "test" ? t.missedIt : t.again}
                  </button>
                  <button className="btn good" onClick={() => grade("known")}>
                    {state.phase === "test" ? t.knewIt : t.gotIt}
                  </button>
                </>
              ) : (
                <>
                  {hintFor !== cardKey && (
                    <button type="button" className="btn nav" onClick={() => setHintFor(cardKey)}>
                      {dict.study.hint}
                    </button>
                  )}
                  <button type="button" className="btn accent" onClick={() => dispatch({ type: "flip" })}>
                    {dict.study.showAnswer}
                  </button>
                </>
              )}
            </StudyBar>
            {dialog && (
              <CardDialog
                deckId={deck.id}
                card={dialog === "edit" ? cardById(state.queue[state.pos]) : undefined}
                onClose={() => setDialog(null)}
              />
            )}
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
            onRevise={() => startRevision(allIds)} onRetest={startTest}
 />
        )}
      </div>

      {inFlow && !showInstructions && (
        <button className="help-btn" onMouseDown={noMouseFocus} onClick={() => setShowInstructions(true)}>
          {t.instructionsButton}
        </button>
      )}
    </main>
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
  // If any card in the deck has a thought bubble, every step keeps the bubble's headroom, so the card
  // stays in the same place while walking through instead of jumping down whenever a bubble appears.
  const wrapClass = `learn-wrap${deck.cards.some((c) => c.illustration) ? " has-bubble" : ""}`;
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
      <div className={wrapClass}>
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
    <div className={wrapClass}>
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

/** For ordered decks: the object placed at a stop, or the memory cue sentence when there's no short object word. */
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

/** A large question card that reveals the answer below the question; also used by the spaced repetition review (as a test card). */
export function FlipCard(props: {
  deck: Deck;
  card: Card;
  position: number;
  test: boolean;
  flipped: boolean;
  onFlip: () => void;
  /** Whether the memory-cue hint (Tab) is showing. */
  showHint?: boolean;
  /** A "type the answer" card: clicking the card doesn't reveal it, the typing box does. */
  typed?: boolean;
  /** Shown under the question before the answer is revealed (the typing box). */
  frontExtra?: ReactNode;
  /** Shown above the answer once revealed (the verdict on what was typed). */
  backExtra?: ReactNode;
  t: T;
}) {
  const { deck, card, position: n, test, flipped, onFlip, t } = props;
  const study = useI18n().t.study;
  const ordered = deck.kind === "ordered";

  // Just the question: a deck's own test question, or the stop/number/prompt. No generic labels such as
  // "What's the answer?" — that's understood.
  const frontTitle = ordered ? (test ? fill(t.number, { n }) : fill(t.stop, { n })) : card.prompt;
  const question = (test && deckTestQuestion(deck, card, n)) || frontTitle;

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

  // No box around it: the question, then the answer underneath once revealed (click, Enter or Space via
  // the session's keyboard listener). "Show answer", hint and grading live in the StudyBar below.
  return (
    <div
      className={`study-card deal${flipped ? " revealed" : ""}`}
      role={flipped || props.typed ? undefined : "button"}
      tabIndex={flipped || props.typed ? undefined : 0}
      aria-label={flipped || props.typed ? undefined : t.clickToFlip}
      onClick={flipped || props.typed ? undefined : onFlip}
      onKeyDown={(e) => {
        if (!flipped && !props.typed && e.key === "Enter") onFlip();
      }}
    >
      <div className="study-question">
        <p className="study-text">{question}</p>
        {!ordered && <CardImage src={card.promptImage} />}
        {!flipped && props.showHint && <p className="reveal-hint">{memoryHint(deck, card, test, study)}</p>}
        {!flipped && props.frontExtra}
      </div>
      {flipped && (
        <div className="study-answer" aria-live="polite">
          {props.backExtra}
          <p className={`study-text answer${back.titleClass ? ` ${back.titleClass}` : ""}`}>{back.title}</p>
          <CardImage src={back.image} />
          {back.sub && <p className="sub">{back.sub}</p>}
          {back.line && <p className="learn-text muted">{back.line}</p>}
          {card.note && <CardNote note={card.note} t={t} />}
        </div>
      )}
    </div>
  );
}

/**
 * The bar along the bottom while answering cards: an optional status on the left (spaced-repetition
 * counts), the main actions in the middle (hint / show answer, then the grade buttons), and undo, bury,
 * add, edit plus a "Keyboard shortcuts" list on the right, so the shortcuts aren't always on screen.
 */
export function StudyBar(props: {
  t: StudyT;
  left?: ReactNode;
  children: ReactNode;
  canUndo: boolean;
  onUndo: () => void;
  onBury?: () => void;
  onAdd: () => void;
  onEdit: () => void;
  shortcuts: [key: string, action: string][];
  shortcutsOpen: boolean;
  onToggleShortcuts: () => void;
}) {
  const { t } = props;
  // The focused button often disappears (Show answer turns into the grade buttons, grading moves on to the
  // next card). Keep keyboard focus in the bar then, instead of letting it fall back to the top of the page;
  // Tab goes on to the new buttons from there, and the study shortcuts keep working.
  const mainRef = useRef<HTMLDivElement>(null);
  const focusWasHere = useRef(false);
  useEffect(() => {
    const active = document.activeElement;
    if (focusWasHere.current && (!active || active === document.body)) mainRef.current?.focus();
  });
  return (
    <div className="study-bar" onMouseDown={noMouseFocus}>
      {props.shortcutsOpen && (
        <div className="shortcuts-panel" role="dialog" aria-label={t.shortcuts}>
          <dl>
            {props.shortcuts.map(([key, action]) => (
              <div key={key + action}>
                <dt>
                  <kbd>{key}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className="study-bar-inner">
        <div className="study-bar-left">{props.left}</div>
        <div
          className="study-bar-main"
          ref={mainRef}
          tabIndex={-1}
          onFocus={() => (focusWasHere.current = true)}
          // Leaving for another element ends it; a removed button blurs with nowhere to go (relatedTarget null).
          onBlur={(e) => (focusWasHere.current = e.relatedTarget === null || e.currentTarget.contains(e.relatedTarget))}
        >
          {props.children}
        </div>
        <div className="study-bar-tools">
          <button type="button" disabled={!props.canUndo} onClick={props.onUndo}>
            {t.undo}
          </button>
          {props.onBury && (
            <button type="button" title={t.buryHint} onClick={props.onBury}>
              {t.bury}
            </button>
          )}
          <button type="button" onClick={props.onAdd}>
            {t.addCard}
          </button>
          <button type="button" onClick={props.onEdit}>
            {t.editCard}
          </button>
          <button type="button" className="shortcuts-button" aria-expanded={props.shortcutsOpen} onClick={props.onToggleShortcuts}>
            {t.shortcuts} <kbd>?</kbd>
          </button>
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
  // Started from the introduction (/start): the results lead on to its last step, the account offer.
  const onboarding = useOnboarding();
  const inIntroduction = onboarding.tutorialPending && deck.id === TUTORIAL_DECK_ID;
  const intro = useI18n().t.onboarding;

  return (
    <section className="summary">
      <p className="score">
        {known} / {state.queue.length}
      </p>
      <h2>{title}</h2>
      <p>{pct === 1 ? t.perfectText : t.missedText}</p>
      {inIntroduction && (
        <div className="onboarding-next">
          <p>{intro.afterTutorial}</p>
          <Link href="/start?step=account" className="btn accent">
            {intro.afterTutorialButton}
          </Link>
        </div>
      )}
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
