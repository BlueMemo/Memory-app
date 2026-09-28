import type { Metadata } from "next";
import { DeckCreatorView } from "@/components/DeckCreatorView";

export const metadata: Metadata = { title: "Create a new deck" };

export default function NewDeckPage() {
  return <DeckCreatorView />;
}
