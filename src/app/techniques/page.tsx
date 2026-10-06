import type { Metadata } from "next";
import { TechniquesView } from "@/components/TechniquesView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "Memory techniques",
  description: "The memory palace, active recall and spaced repetition: what they are, how to do them and how BlueMemo uses them.",
  path: "/techniques",
});

export default function TechniquesPage() {
  return <TechniquesView />;
}
