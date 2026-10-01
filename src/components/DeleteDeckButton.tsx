"use client";

import { useI18n } from "@/i18n";
import { removeDeckSrs } from "@/lib/srs/store";
import { deleteUserDeck } from "@/lib/userDecks";

export function DeleteDeckButton({ deckId }: { deckId: string }) {
  const t = useI18n().t.library;
  return (
    <button
      className="save-btn danger"
      onClick={() => {
        if (!confirm(t.deleteConfirm)) return;
        deleteUserDeck(deckId);
        removeDeckSrs(deckId);
      }}
    >
      {t.deleteDeck}
    </button>
  );
}
