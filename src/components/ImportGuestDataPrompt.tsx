"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { importLocalSavedDecksToAccount } from "@/lib/library";
import { fill } from "@/lib/practice";
import { useUser } from "@/lib/supabase/useUser";
import { importLocalDecksToAccount, localDeckCount } from "@/lib/userDecks";

/** Shown once after signing in, if this browser has guest-mode decks worth moving into the account. */
export function ImportGuestDataPrompt() {
  const t = useI18n().t.library;
  const { user, loading } = useUser();
  const [dismissed, setDismissed] = useState(false);
  const [imported, setImported] = useState(false);

  // Reading localStorage isn't reactive, so this only re-runs when the signed-in user changes —
  // the count stays stable through the import even as it clears local storage along the way.
  const userId = user?.id;
  const deckCount = useMemo(() => (userId ? localDeckCount() : 0), [userId]);

  if (loading || !user || dismissed || deckCount === 0) return null;

  if (imported) return <p className="form-success" role="status">{t.imported}</p>;

  return (
    <div className="empty-state">
      <p>{deckCount === 1 ? t.importPromptOne : fill(t.importPrompt, { n: deckCount })}</p>
      <div className="controls left">
        <button
          className="btn accent"
          onClick={async () => {
            await importLocalDecksToAccount();
            await importLocalSavedDecksToAccount();
            setImported(true);
          }}
        >
          {t.import}
        </button>
        <button className="btn nav" onClick={() => setDismissed(true)}>
          {t.skipImport}
        </button>
      </div>
    </div>
  );
}
