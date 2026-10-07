import type { Metadata } from "next";
import { LoadingPreview } from "@/components/LoadingPreview";

// Not linked from the site: shows the loading screen on its own, since normally it's only seen for a moment.
export const metadata: Metadata = { title: "Loading screen", robots: { index: false } };

export default function LoadingPreviewPage() {
  return <LoadingPreview />;
}
