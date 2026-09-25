import type { Metadata } from "next";
import { DiscoverView } from "@/components/DiscoverView";

export const metadata: Metadata = { title: "Discover Decks" };

export default function DiscoverPage() {
  return <DiscoverView />;
}
