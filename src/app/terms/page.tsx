import type { Metadata } from "next";
import { LegalView } from "@/components/LegalView";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return <LegalView doc="terms" />;
}
