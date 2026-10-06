import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/og/card";

// The link preview picture for every page without one of its own.
export const alt = "BlueMemo: flashcards built on memory techniques";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    title: "Flashcards built on memory techniques",
    subtitle: "Picture it, place it along a route you know, and remember it. Free, no account needed.",
  });
}
