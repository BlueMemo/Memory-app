import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";
import { getPublishedDeckSummary } from "@/lib/og/publishedDeckSummary";

// The preview picture for a published deck's link: its title, size and who shared it.
export const alt = "A deck shared on BlueMemo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const deck = await getPublishedDeckSummary((await params).id);
  if (!deck) return ogCard({ title: "A shared deck", subtitle: "Open it on BlueMemo to practise it." });
  return ogCard({
    eyebrow: `${deck.cardCount} cards${deck.author ? ` · shared by ${deck.author}` : ""}`,
    title: deck.title,
    subtitle: deck.description || "Practise it with memory techniques on BlueMemo.",
  });
}
