import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeSession } from "@/components/PracticeSession";
import { getDeck, officialDecks } from "@/decks";

export const dynamicParams = false;

export function generateStaticParams() {
  return officialDecks.map((d) => ({ deckId: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]/practice">): Promise<Metadata> {
  const { deckId } = await params;
  return { title: getDeck(deckId)?.title };
}

export default async function PracticePage({ params }: PageProps<"/decks/[deckId]/practice">) {
  const { deckId } = await params;
  const deck = getDeck(deckId);
  if (!deck) notFound();
  return <PracticeSession deck={deck} />;
}
