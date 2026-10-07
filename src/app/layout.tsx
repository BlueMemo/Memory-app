import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/og/meta";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/lib/themeScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Numbers (counts, stats, intervals) are set in the matching mono, so columns of figures line up.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
export const viewport: Viewport = { themeColor: "#0d0f12" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-* attributes on <html> before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <SiteAnalytics />
      </body>
    </html>
  );
}
