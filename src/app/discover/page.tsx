import type { Metadata } from "next";
import { DiscoverView } from "@/components/DiscoverView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "Discover Decks",
  description: "Find flashcard decks to learn with memory techniques, official ones and decks shared by other learners.",
  path: "/discover",
});

export default function DiscoverPage() {
  return <DiscoverView />;
}
