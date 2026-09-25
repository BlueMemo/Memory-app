import type { Deck } from "@/lib/types";
import { helloTenLanguages } from "./hello";
import { largestCountries } from "./largest-countries";

/** Official decks made by the team. User decks will come from the database in later phases. */
export const officialDecks: Deck[] = [largestCountries, helloTenLanguages];

export function getDeck(id: string): Deck | undefined {
  return officialDecks.find((d) => d.id === id);
}
