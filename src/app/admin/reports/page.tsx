import type { Metadata } from "next";
import { AdminReportsView } from "@/components/AdminReportsView";

// Not linked anywhere public and kept out of search results; the page itself only shows anything to moderators.
export const metadata: Metadata = { title: "Moderation", robots: { index: false, follow: false } };

export default function AdminReportsPage() {
  return <AdminReportsView />;
}
