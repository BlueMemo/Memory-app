import type { Metadata } from "next";
import { DeckGate } from "@/components/DeckGate";
import { getDeck, officialDecks } from "@/decks";

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]/practice">): Promise<Metadata> {
  const { deckId } = await params;
  const title = getDeck(deckId)?.title;
  return title ? { title } : {};
}

export default async function PracticePage({ params, searchParams }: PageProps<"/decks/[deckId]/practice">) {
  const { deckId } = await params;
  const startInReview = (await searchParams)?.mode === "review";
  return <DeckGate deckId={deckId} officialDeck={getDeck(deckId)} mode="practice" startInReview={startInReview} />;
}
