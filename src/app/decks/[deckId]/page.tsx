import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeckView } from "@/components/DeckView";
import { getDeck, officialDecks } from "@/decks";

export const dynamicParams = false;

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]">): Promise<Metadata> {
  const { deckId } = await params;
  return { title: getDeck(deckId)?.title };
}

export default async function DeckPage({ params }: PageProps<"/decks/[deckId]">) {
  const { deckId } = await params;
  const deck = getDeck(deckId);
  if (!deck) notFound();
  return <DeckView deck={deck} />;
}
