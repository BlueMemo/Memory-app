"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";

export function DeckNotFound() {
  const t = useI18n().t.deck;
  return (
    <main className="page narrow">
      <h1 className="deck-title">{t.notFoundTitle}</h1>
      <p className="deck-description">{t.notFoundText}</p>
      <Link href="/library" className="link-muted">
        {t.backToLibrary}
      </Link>
    </main>
  );
}
