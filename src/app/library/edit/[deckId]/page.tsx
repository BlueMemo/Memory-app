import type { Metadata } from "next";
import { DeckCreatorView } from "@/components/DeckCreatorView";

export const metadata: Metadata = { title: "Edit deck" };

export default async function EditDeckPage({ params }: PageProps<"/library/edit/[deckId]">) {
  const { deckId } = await params;
  return <DeckCreatorView editDeckId={deckId} />;
}
