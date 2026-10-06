import type { Metadata } from "next";

// Text for link previews (WhatsApp, Instagram, iMessage, ...). Metadata is rendered on the server, before
// the visitor's language is known, so it's in English like the page titles.

export const SITE_URL = "https://bluememo.eu";
export const SITE_TITLE = "BlueMemo: flashcards built on memory techniques";
export const SITE_DESCRIPTION =
  "Turn what you want to learn into vivid images, place them along a route you know, and let spaced repetition keep them. Free, no account needed.";

/**
 * A page's title and description, for the browser tab and the link preview alike. A page's `openGraph`
 * replaces the layout's instead of merging with it, so the shared fields are repeated here.
 */
export function pageMetadata({ title, description = SITE_DESCRIPTION, path }: { title: string; description?: string; path?: string }): Metadata {
  return {
    title,
    description,
    openGraph: { title, description, siteName: "BlueMemo", type: "website", ...(path ? { url: path } : {}) },
    twitter: { card: "summary_large_image", title, description },
  };
}
