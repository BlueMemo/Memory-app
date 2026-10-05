import type { Metadata } from "next";
import { QuickAddView } from "@/components/QuickAddView";

export const metadata: Metadata = { title: "Add cards" };

export default async function QuickAddPage({ searchParams }: PageProps<"/library/add">) {
  const { deck } = await searchParams;
  return <QuickAddView initialDeckId={typeof deck === "string" ? deck : null} />;
}
