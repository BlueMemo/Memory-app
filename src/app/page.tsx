import { redirect } from "next/navigation";

// Discover is the start page for now; "/" can become a personal dashboard once accounts exist.
export default function Home() {
  redirect("/discover");
}
