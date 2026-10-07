import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = { title: "Account" };

// ?signup=1 (from the introduction) opens on "Create account".
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { signup } = await searchParams;
  return <AccountView startWithSignUp={signup === "1"} />;
}
