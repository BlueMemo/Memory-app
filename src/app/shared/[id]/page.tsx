import type { Metadata } from "next";
import { SharedDeckView } from "@/components/SharedDeckView";
import { pageMetadata } from "@/lib/og/meta";
import { getPublishedDeckSummary } from "@/lib/og/publishedDeckSummary";

export async function generateMetadata({ params }: PageProps<"/shared/[id]">): Promise<Metadata> {
  const { id } = await params;
  const deck = await getPublishedDeckSummary(id);
  if (!deck) return pageMetadata({ title: "Shared deck" });
  const by = deck.author ? `, shared by ${deck.author}` : "";
  return pageMetadata({
    title: deck.title,
    description: deck.description ? `${deck.description} (${deck.cardCount} cards${by})` : `${deck.cardCount} cards${by}. Practise it on BlueMemo.`,
    path: `/shared/${id}`,
  });
}

export default async function SharedDeckPage({ params }: PageProps<"/shared/[id]">) {
  const { id } = await params;
  return <SharedDeckView id={id} />;
}
