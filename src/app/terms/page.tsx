import type { Metadata } from "next";
import { LegalView } from "@/components/LegalView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "Terms of use",
  description: "The rules for using BlueMemo and sharing decks.",
  path: "/terms",
});

export default function TermsPage() {
  return <LegalView doc="terms" />;
}
