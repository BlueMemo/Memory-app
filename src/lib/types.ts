export type Lang = "en" | "sv";

/** Built-in drawings, used sparingly in official decks to explain the technique. */
export type IllustrationName = "tikka-door" | "shoes-chopsticks" | "nigeria-flag";

export interface Card {
  id: string;
  /** What the learner has to remember, e.g. "India" or "Hola". */
  answer: string;
  /** The question side for unordered decks, e.g. "Spanish". Ordered decks ask by position. */
  prompt?: string;
  /** The association object, e.g. "Tikka masala". Leave out to let the learner make up their own. */
  object?: string;
  /** A scene to visualize. Words in CAPITALS are highlighted as the sound-alike part. */
  visualization?: string;
  /** An example object, offered after a delay when the learner makes up their own. */
  suggestion?: string;
  /** Extra information shown together with the answer, e.g. "≈ 1.46 billion people". */
  details?: string;
  /** A free-form note from the deck author. */
  note?: string;
  illustration?: { name: IllustrationName; side?: "left" | "right" };
  /** A country flag shown with the answer in revision and the test, by code (see components/Flag.tsx). */
  flag?: string;
  /** "YYYY-MM-DD": spaced repetition makes sure the card comes up again before this day (e.g. a test). */
  dueBy?: string;
  /** When the card was created (ISO). Cards made before 2026-10-05 don't have it. */
  createdAt?: string;
  /**
   * How the learner answers in a spaced-repetition review: "show" (flip the card, the default) or "type"
   * (type the answer, which is checked for spelling). Kept on each card, so a deck can mix both.
   */
  answerMode?: "show" | "type";
  /** Learner-supplied images (data URLs), shown alongside the matching text during practice. */
  promptImage?: string;
  answerImage?: string;
  visualizationImage?: string;
}

/** An instruction card shown during the walk-through, before the card at `beforeCard` (0-based). */
export interface DeckNote {
  beforeCard: number;
  badge: string;
  title: string;
  /** Supports **bold** for emphasis. */
  body: string;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  /** Language of the deck's own content (cards, instructions), independent of the site language. */
  language: Lang;
  /**
   * "ordered": a memory route, where each card is a stop in a fixed order.
   * "unordered": a loose set of associations, practised in random order.
   */
  kind: "ordered" | "unordered";
  /** What the order means, e.g. "by population". Ordered decks only. */
  orderLabel?: string;
  official?: boolean;
  /** Paragraphs explaining the technique for this deck. Supports **bold**. */
  instructions: string[];
  notes?: DeckNote[];
  /** Show the answer while walking through an ordered route. Defaults to true. */
  showAnswerInWalkthrough?: boolean;
  /**
   * Custom test question. Placeholders: {ordinal} ("2nd"), {n} (2) and {prompt}.
   * `first` replaces `other` for the first card of an ordered deck.
   */
  testQuestion?: { first?: string; other: string };
  cards: Card[];
}
