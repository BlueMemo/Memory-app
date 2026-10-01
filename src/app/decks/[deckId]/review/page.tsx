import type { Metadata } from "next";
import { DeckGate } from "@/components/DeckGate";
import { getDeck, officialDecks } from "@/decks";

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]/review">): Promise<Metadata> {
  const { deckId } = await params;
  const title = getDeck(deckId)?.title;
  return title ? { title } : {};
}

export default async function ReviewPage({ params }: PageProps<"/decks/[deckId]/review">) {
  const { deckId } = await params;
  return <DeckGate deckId={deckId} officialDeck={getDeck(deckId)} mode="review" />;
}
