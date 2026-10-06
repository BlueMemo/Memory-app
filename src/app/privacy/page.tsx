import type { Metadata } from "next";
import { LegalView } from "@/components/LegalView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: "What BlueMemo collects, why, and how to download or delete it.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <LegalView doc="privacy" />;
}
