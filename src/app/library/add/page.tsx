import type { Metadata } from "next";
import { QuickAddView } from "@/components/QuickAddView";

export const metadata: Metadata = { title: "Add cards" };

export default async function QuickAddPage({ searchParams }: PageProps<"/library/add">) {
  const { deck, back } = await searchParams;
  const deckId = typeof deck === "string" ? deck : null;
  // ?back=deck (A on a deck page): Done and the back link return to that deck instead of the Library.
  return <QuickAddView initialDeckId={deckId} returnToDeck={back === "deck" && deckId !== null} />;
}
