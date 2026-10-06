import type { Metadata } from "next";
import { AboutView } from "@/components/AboutView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "About us",
  description: "Who we are and why we're building BlueMemo: memory techniques like the champions use, made simple enough for everyday learning.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutView />;
}
