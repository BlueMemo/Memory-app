import type { Metadata } from "next";
import { TechniquesView } from "@/components/TechniquesView";

export const metadata: Metadata = { title: "Memory techniques" };

export default function TechniquesPage() {
  return <TechniquesView />;
}
