import type { Card, Deck, Lang } from "./types";

/**
 * The practice flow for every deck:
 *   intro (instructions) -> overview -> walkthrough -> revision rounds -> mastered -> test -> results
 * Revision repeats with only the missed cards until every card is remembered.
 */
export type Phase =
  | "intro"
  | "overview"
  | "walkthrough"
  | "revision"
  | "roundSummary"
  | "mastered"
  | "test"
  | "results";

export type Grade = "known" | "again";

/** One card in the walk-through: a deck card, an author's note, or the closing "time to revise" card. */
export type Step =
  | { type: "card"; cardIndex: number }
  | { type: "note"; noteIndex: number }
  | { type: "revise" };

export function buildSteps(deck: Deck): Step[] {
  const steps: Step[] = [];
  deck.cards.forEach((_, cardIndex) => {
    deck.notes?.forEach((note, noteIndex) => {
      if (note.beforeCard === cardIndex) steps.push({ type: "note", noteIndex });
    });
    steps.push({ type: "card", cardIndex });
  });
  steps.push({ type: "revise" });
  return steps;
}

export interface SessionState {
  phase: Phase;
  /** Position in the walk-through steps. */
  step: number;
  stepCount: number;
  /** Card ids for the current revision round or test. */
  queue: string[];
  pos: number;
  flipped: boolean;
  /** Grades for the current round or test only. */
  grades: Record<string, Grade>;
  /** Increases every time a round or test starts, so views can remount cleanly. */
  round: number;
}

export type Action =
  | { type: "begin" }
  | { type: "startWalkthrough" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "startRevision"; order: string[] }
  | { type: "startTest"; order: string[] }
  | { type: "flip" }
  | { type: "grade"; grade: Grade };

export function initSession(stepCount: number): SessionState {
  return { phase: "intro", step: 0, stepCount, queue: [], pos: 0, flipped: false, grades: {}, round: 0 };
}

/** Starts straight in revision, skipping the walkthrough — for a deck you've already learned before. */
export function initReviewSession(deck: Deck, stepCount: number, random: () => number = Math.random): SessionState {
  const allIds = deck.cards.map((c) => c.id);
  return {
    phase: "revision",
    step: 0,
    stepCount,
    queue: orderCards(deck, allIds, random),
    pos: 0,
    flipped: false,
    grades: {},
    round: 1,
  };
}

/** Starts straight in the test, e.g. the final test across all chapters of a big deck. */
export function initTestSession(deck: Deck, stepCount: number, random: () => number = Math.random): SessionState {
  return { ...initReviewSession(deck, stepCount, random), phase: "test" };
}

export function practiceReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "begin":
      return state.phase === "intro" ? { ...state, phase: "overview" } : state;

    case "startWalkthrough":
      return { ...state, phase: "walkthrough", step: 0 };

    case "next":
      if (state.phase !== "walkthrough" || state.step >= state.stepCount - 1) return state;
      return { ...state, step: state.step + 1 };

    case "prev":
      if (state.phase !== "walkthrough" || state.step === 0) return state;
      return { ...state, step: state.step - 1 };

    case "startRevision":
    case "startTest":
      return {
        ...state,
        phase: action.type === "startTest" ? "test" : "revision",
        queue: action.order,
        pos: 0,
        flipped: false,
        grades: {},
        round: state.round + 1,
      };

    case "flip":
      if (state.phase !== "revision" && state.phase !== "test") return state;
      return { ...state, flipped: !state.flipped };

    case "grade": {
      // A card can only be graded after it has been flipped to check the answer.
      if ((state.phase !== "revision" && state.phase !== "test") || !state.flipped) return state;
      const grades = { ...state.grades, [state.queue[state.pos]]: action.grade };
      if (state.pos < state.queue.length - 1) {
        return { ...state, grades, pos: state.pos + 1, flipped: false };
      }
      if (state.phase === "test") return { ...state, grades, phase: "results" };
      const anyMissed = state.queue.some((id) => grades[id] === "again");
      return { ...state, grades, phase: anyMissed ? "roundSummary" : "mastered" };
    }
  }
}

export function missedIds(state: SessionState): string[] {
  return state.queue.filter((id) => state.grades[id] === "again");
}

export function knownCount(state: SessionState): number {
  return state.queue.filter((id) => state.grades[id] === "known").length;
}

/** Ordered decks keep their route order; unordered decks are shuffled. */
export function orderCards(deck: Deck, ids: string[], random: () => number = Math.random): string[] {
  if (deck.kind === "ordered") {
    const rank = new Map(deck.cards.map((c, i) => [c.id, i]));
    return [...ids].sort((a, b) => rank.get(a)! - rank.get(b)!);
  }
  const out = [...ids];
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

export function ordinal(n: number, lang: Lang): string {
  const last = n % 10;
  const teen = n % 100 >= 11 && n % 100 <= 13;
  if (lang === "sv") return n + ((last === 1 || last === 2) && !teen ? ":a" : ":e");
  if (teen) return n + "th";
  return n + (last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th");
}

/** Replaces {name} placeholders in a template. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}

/** The deck's own test question for a card, or undefined to use the site's default wording. */
export function deckTestQuestion(deck: Deck, card: Card, position: number): string | undefined {
  const q = deck.testQuestion;
  if (!q) return undefined;
  const template = position === 1 && q.first ? q.first : q.other;
  return fill(template, { n: position, ordinal: ordinal(position, deck.language), prompt: card.prompt ?? "" });
}
