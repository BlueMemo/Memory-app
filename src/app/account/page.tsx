import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = { title: "Account" };

// ?signup=1 (from the introduction) opens on "Create account".
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { signup, notice } = await searchParams;
  // ?notice= comes from the email-link routes (auth/callback, auth/confirm).
  const known = ["confirmed", "reset-link", "link-error"] as const;
  const shown = known.find((n) => n === notice) ?? null;
  return <AccountView startWithSignUp={signup === "1"} notice={shown} />;
}
