// The celebration shown when a deck's due cards are all done. One of 15, picked by weight: the common
// ones most of the time, a few rare ones, and one legendary (1 in 1000). Weights are percentages and add
// up to 100. Each has its own picture (a profile-picture drawing, or the logo) and particle effect;
// texts live in i18n `celebrations.items`. /celebrations shows every one (a preview page, not linked).

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type Effect =
  | "confetti"
  | "stars"
  | "balloons"
  | "fireworks"
  | "sparkles"
  | "bubbles"
  | "cards"
  | "fireflies"
  | "feathers"
  | "hearts"
  | "rays"
  | "crystals"
  | "gold"
  | "aurora"
  | "legendary";

export interface Celebration {
  id: string;
  /** Chance in percent. */
  weight: number;
  /** A drawing from AVATAR_ART, or "logo" for the BlueMemo door. */
  art: string;
  effect: Effect;
}

export const CELEBRATIONS: Celebration[] = [
  { id: "confetti", weight: 20, art: "stars", effect: "confetti" },
  { id: "starfall", weight: 15, art: "moon", effect: "stars" },
  { id: "balloons", weight: 10, art: "balloon", effect: "balloons" },
  { id: "fireworks", weight: 10, art: "castle", effect: "fireworks" },
  { id: "brightIdea", weight: 10, art: "lightbulb", effect: "sparkles" },
  { id: "bubbles", weight: 8, art: "bubble", effect: "bubbles" },
  { id: "cardStorm", weight: 7, art: "book", effect: "cards" },
  { id: "lantern", weight: 5, art: "lantern", effect: "fireflies" },
  { id: "owl", weight: 5, art: "owl", effect: "feathers" },
  { id: "elephant", weight: 4, art: "elephant", effect: "hearts" },
  { id: "lighthouse", weight: 3, art: "lighthouse", effect: "rays" },
  { id: "crystal", weight: 1.5, art: "crystal", effect: "crystals" },
  { id: "crown", weight: 1, art: "crown", effect: "gold" },
  { id: "aurora", weight: 0.4, art: "mountain", effect: "aurora" },
  { id: "palace", weight: 0.1, art: "logo", effect: "legendary" },
];

export function rarityOf(weight: number): Rarity {
  if (weight <= 0.1) return "legendary";
  if (weight < 1) return "epic";
  if (weight < 3) return "rare";
  if (weight < 8) return "uncommon";
  return "common";
}

/** The celebration for a random number in [0, 1): each one's share of the range is its weight. */
export function pickCelebration(random: number): Celebration {
  let point = random * 100;
  for (const c of CELEBRATIONS) {
    if (point < c.weight) return c;
    point -= c.weight;
  }
  return CELEBRATIONS[0]; // only reachable through floating-point rounding at the very top
}

export const celebrationById = (id: string | null): Celebration | undefined => CELEBRATIONS.find((c) => c.id === id);
