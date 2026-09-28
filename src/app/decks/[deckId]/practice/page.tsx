import type { Metadata } from "next";
import { PracticeSession } from "@/components/PracticeSession";
import { UserDeckGate } from "@/components/UserDeckGate";
import { getDeck, officialDecks } from "@/decks";

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]/practice">): Promise<Metadata> {
  const { deckId } = await params;
  const title = getDeck(deckId)?.title;
  return title ? { title } : {};
}

export default async function PracticePage({ params }: PageProps<"/decks/[deckId]/practice">) {
  const { deckId } = await params;
  const deck = getDeck(deckId);
  if (deck) return <PracticeSession deck={deck} />;
  return <UserDeckGate deckId={deckId} mode="practice" />;
}
