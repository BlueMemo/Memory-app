import type { Metadata } from "next";
import { OnboardingView } from "@/components/OnboardingView";
import { pageMetadata } from "@/lib/og/meta";

export const metadata: Metadata = pageMetadata({
  title: "Get started",
  description: "A few questions, then learn the ten most populated countries in about five minutes.",
  path: "/start",
});

// ?step=account is the last step, reached from the tutorial's results; ?begin=1 (the home page's "Get
// started") skips the welcome screen, which would only ask the same thing again.
export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const { step, begin } = await searchParams;
  return <OnboardingView finalStep={step === "account"} skipWelcome={begin === "1"} />;
}
