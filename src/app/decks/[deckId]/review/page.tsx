import type { Metadata } from "next";
import { ReviewSession } from "@/components/ReviewSession";
import { UserDeckGate } from "@/components/UserDeckGate";
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
  const deck = getDeck(deckId);
  if (deck) return <ReviewSession deck={deck} />;
  return <UserDeckGate deckId={deckId} mode="review" />;
}
