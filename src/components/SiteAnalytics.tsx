"use client";

import { Analytics } from "@vercel/analytics/next";

// Vercel Web Analytics: page views counted without cookies or anything stored on the device, so no consent
// banner is needed. Sends only the path: query strings (search terms, deck ids) are dropped, and the ids of
// learners' own decks are replaced so a private deck can't be told apart.
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        url.search = "";
        url.pathname = url.pathname.replace(/^\/decks\/user-[^/]+/, "/decks/own").replace(/^\/library\/edit\/[^/]+/, "/library/edit/deck");
        return { ...event, url: url.toString() };
      }}
    />
  );
}
