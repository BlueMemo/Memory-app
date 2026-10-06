import type { Metadata } from "next";
import { LegalView } from "@/components/LegalView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "Who runs BlueMemo",
  description: "Who is behind BlueMemo, and how to reach us.",
  path: "/legal",
});

export default function LegalPage() {
  return <LegalView doc="operator" />;
}
