import type { Metadata } from "next";
import { CelebrationGallery } from "@/components/CelebrationGallery";

export const metadata: Metadata = { title: "Celebrations", robots: { index: false } };

export default function CelebrationsPage() {
  return <CelebrationGallery />;
}
