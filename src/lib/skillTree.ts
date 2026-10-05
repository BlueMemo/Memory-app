// The Memory Tree (/skills): memory techniques as a skill tree. The roots are the basics everything else
// builds on; each branch is an area (numbers, geography, ...) whose skills build on the one before.
// Texts live in the i18n files (skills.branches / skills.nodes). A skill with an `href` has content to
// open; the rest show as "coming soon" and can be filled in over time — add the content, then the href.

export interface Skill {
  id: string;
  /** Where its content is, once there is some. */
  href?: string;
}

export interface Branch {
  id: string;
  /** In order: each skill builds on the one above it. */
  skills: Skill[];
}

/** The basics every branch grows from. */
export const ROOT_SKILLS: Skill[] = [
  { id: "visualize", href: "/about#technique" },
  { id: "associations", href: "/about#associations" },
  { id: "memoryPalace", href: "/techniques#memory-palace" },
  { id: "activeRecall", href: "/techniques#active-recall" },
  { id: "spacedRepetition", href: "/techniques#spaced-repetition" },
];

export const BRANCHES: Branch[] = [
  { id: "numbers", skills: [{ id: "numberShapes" }, { id: "majorSystem" }, { id: "dates" }, { id: "phoneNumbers" }, { id: "pao" }] },
  { id: "geography", skills: [{ id: "countries", href: "/decks/largest-countries" }, { id: "capitals" }, { id: "flags" }, { id: "maps" }] },
  { id: "languages", skills: [{ id: "vocabulary", href: "/decks/hello-10-languages" }, { id: "grammarGender" }, { id: "phrases" }] },
  { id: "names", skills: [{ id: "namesFaces" }, { id: "groups" }] },
  { id: "lists", skills: [{ id: "shoppingLists" }, { id: "rankings" }, { id: "timelines" }] },
  { id: "texts", skills: [{ id: "speeches" }, { id: "poems" }, { id: "quotes" }] },
  { id: "cards", skills: [{ id: "playingCards" }, { id: "fullDeck" }] },
  { id: "study", skills: [{ id: "definitions" }, { id: "formulas" }, { id: "examPrep" }] },
];

export const allSkills = (): Skill[] => [...ROOT_SKILLS, ...BRANCHES.flatMap((b) => b.skills)];
