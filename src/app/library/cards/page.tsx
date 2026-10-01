import type { Metadata } from "next";
import { CardBrowserView } from "@/components/CardBrowserView";

export const metadata: Metadata = { title: "Browse cards" };

export default function CardBrowserPage() {
  return <CardBrowserView />;
}
