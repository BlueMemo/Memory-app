import type { Metadata } from "next";
import { DeckView } from "@/components/DeckView";
import { UserDeckGate } from "@/components/UserDeckGate";
import { getDeck, officialDecks } from "@/decks";

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]">): Promise<Metadata> {
  const { deckId } = await params;
  const title = getDeck(deckId)?.title;
  return title ? { title } : {};
}

// Ids not among the official decks belong to decks a learner created themselves, which only
// exist in their browser: UserDeckGate looks those up on the client instead of 404ing here.
export default async function DeckPage({ params }: PageProps<"/decks/[deckId]">) {
  const { deckId } = await params;
  const deck = getDeck(deckId);
  if (deck) return <DeckView deck={deck} />;
  return <UserDeckGate deckId={deckId} mode="view" />;
}
