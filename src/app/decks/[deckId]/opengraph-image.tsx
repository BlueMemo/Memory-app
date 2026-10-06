import { getDeck, officialDecks } from "@/decks";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

// Official decks get their own preview picture. Learners' own decks are private (only in their browser
// or account), so their links show the general BlueMemo picture.
export const alt = "A BlueMemo deck";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export default async function Image({ params }: { params: Promise<{ deckId: string }> }) {
  const deck = getDeck((await params).deckId);
  if (!deck) return ogCard({ title: "Flashcards built on memory techniques", subtitle: "Picture it, place it along a route you know, and remember it." });
  return ogCard({ eyebrow: `Official deck · ${deck.cards.length} cards`, title: deck.title, subtitle: deck.description });
}
