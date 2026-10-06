import type { Metadata } from "next";
import { LegalView } from "@/components/LegalView";

export const metadata: Metadata = { title: "Who runs BlueMemo" };

export default function LegalPage() {
  return <LegalView doc="operator" />;
}
