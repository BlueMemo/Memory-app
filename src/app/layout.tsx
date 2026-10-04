import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Headline font (h1/h2 and the logo wordmark); Geist stays for everything read while studying.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: { default: "BlueMemo", template: "%s · BlueMemo" },
  description: "Flashcards built around visualization and memory routes.",
};

// Matches the dark-first background, so mobile browser bars blend in.
export const viewport: Viewport = { themeColor: "#121417" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${newsreader.variable}`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
