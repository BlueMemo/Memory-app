import type { Metadata } from "next";
import { ImportView } from "@/components/ImportView";

export const metadata: Metadata = { title: "Import a deck" };

export default function ImportPage() {
  return <ImportView />;
}
