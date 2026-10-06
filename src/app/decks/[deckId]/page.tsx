import type { Metadata } from "next";
import { DeckGate } from "@/components/DeckGate";
import { getDeck, officialDecks } from "@/decks";
import { pageMetadata } from "@/lib/og/meta";

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]">): Promise<Metadata> {
  const { deckId } = await params;
  const deck = getDeck(deckId);
  return deck ? pageMetadata({ title: deck.title, description: deck.description, path: `/decks/${deckId}` }) : {};
}

// Official decks are known here; the learner may still have a personal (edited) version of one, and
// decks they created only exist in their browser or account, so DeckGate settles which to show.
export default async function DeckPage({ params }: PageProps<"/decks/[deckId]">) {
  const { deckId } = await params;
  return <DeckGate deckId={deckId} officialDeck={getDeck(deckId)} mode="view" />;
}
