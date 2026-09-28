"use client";

import { useI18n } from "@/i18n";
import { deleteUserDeck } from "@/lib/userDecks";

export function DeleteDeckButton({ deckId }: { deckId: string }) {
  const t = useI18n().t.library;
  return (
    <button
      className="save-btn danger"
      onClick={() => {
        if (confirm(t.deleteConfirm)) deleteUserDeck(deckId);
      }}
    >
      {t.deleteDeck}
    </button>
  );
}
