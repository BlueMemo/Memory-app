"use client";

import { useI18n } from "@/i18n";
import { toggleSavedDeck, useSavedDeckIds } from "@/lib/library";

export function SaveDeckButton({ deckId }: { deckId: string }) {
  const t = useI18n().t.decks;
  const saved = useSavedDeckIds().includes(deckId);
  return (
    <button
      className={`save-btn${saved ? " saved" : ""}`}
      aria-pressed={saved}
      title={saved ? t.savedTitle : undefined}
      onClick={() => toggleSavedDeck(deckId)}
    >
      {saved ? t.saved : t.save}
    </button>
  );
}
