import type { Metadata } from "next";
import { SrsSettingsView } from "@/components/SrsSettingsView";

export const metadata: Metadata = { title: "Settings" };

export default async function SrsSettingsPage({ searchParams }: PageProps<"/library/settings">) {
  const { deck } = await searchParams;
  return <SrsSettingsView deckId={typeof deck === "string" ? deck : null} />;
}
