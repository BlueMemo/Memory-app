import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/og/meta";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/lib/themeScript";
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
  // Makes the link-preview image and URLs absolute, which WhatsApp, Instagram and the rest require.
  metadataBase: new URL(SITE_URL),
  title: { default: "BlueMemo", template: "%s · BlueMemo" },
  description: SITE_DESCRIPTION,
  openGraph: { title: SITE_TITLE, description: SITE_DESCRIPTION, siteName: "BlueMemo", type: "website", url: "/" },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

// Matches the dark-first background, so mobile browser bars blend in.
export const viewport: Viewport = { themeColor: "#121417" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-* attributes on <html> before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={`${geistSans.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
