import type { Metadata } from "next";
import { SharedDeckView } from "@/components/SharedDeckView";

export const metadata: Metadata = { title: "Shared deck" };

export default async function SharedDeckPage({ params }: PageProps<"/shared/[id]">) {
  const { id } = await params;
  return <SharedDeckView id={id} />;
}
