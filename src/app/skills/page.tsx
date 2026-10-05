import type { Metadata } from "next";
import { SkillTreeView } from "@/components/SkillTreeView";

export const metadata: Metadata = { title: "Memory Tree" };

export default function SkillsPage() {
  return <SkillTreeView />;
}
