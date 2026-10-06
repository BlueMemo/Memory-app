import type { Metadata } from "next";
import { SkillTreeView } from "@/components/SkillTreeView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "Memory Tree",
  description: "Memory techniques as a skill tree: start with the basics and grow branches for numbers, languages, names and more.",
  path: "/skills",
});

export default function SkillsPage() {
  return <SkillTreeView />;
}
