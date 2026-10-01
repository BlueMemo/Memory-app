import type { Metadata } from "next";
import { DeckGate } from "@/components/DeckGate";
import type { StartIn } from "@/components/PracticeSession";
import { getDeck, officialDecks } from "@/decks";

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]/practice">): Promise<Metadata> {
  const { deckId } = await params;
  const title = getDeck(deckId)?.title;
  return title ? { title } : {};
}

// ?mode=review skips to revision, ?mode=test to the test (e.g. a big deck's final test);
// ?chapter=N practises one chapter of a big deck.
export default async function PracticePage({ params, searchParams }: PageProps<"/decks/[deckId]/practice">) {
  const { deckId } = await params;
  const { mode, chapter } = await searchParams;
  const startIn: StartIn = mode === "review" ? "review" : mode === "test" ? "test" : "beginning";
  return <DeckGate deckId={deckId} officialDeck={getDeck(deckId)} mode="practice" startIn={startIn} chapter={chapter} />;
}
