import type { Metadata } from "next";
import { LoadingPreview } from "@/components/LoadingPreview";

// Not linked from the site: a place to compare the loading screen designs.
export const metadata: Metadata = { title: "Loading screens", robots: { index: false } };

export default function LoadingPreviewPage() {
  return <LoadingPreview />;
}
