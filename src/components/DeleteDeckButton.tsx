"use client";

import { useI18n } from "@/i18n";
import { removeDeckSrs } from "@/lib/srs/store";
import { deleteUserDeck } from "@/lib/userDecks";

/** Deletes one of the learner's own decks (after confirming). Lives only in the deck's settings. */
export function DeleteDeckButton({ deckId, onDeleted }: { deckId: string; onDeleted?: () => void }) {
  const t = useI18n().t.library;
  return (
    <button
      type="button"
      className="btn danger"
      onClick={async () => {
        if (!confirm(t.deleteConfirm)) return;
        await deleteUserDeck(deckId);
        await removeDeckSrs(deckId);
        onDeleted?.();
      }}
    >
      {t.deleteDeck}
    </button>
  );
}
