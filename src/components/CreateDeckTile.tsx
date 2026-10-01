"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";

/** The "create" tile in the library: build a deck by hand, or import one from a list or file. */
export function CreateDeckTile() {
  const t = useI18n().t.library;
  return (
    <div className="create-tile-wrap">
      <Link href="/library/new" className="create-tile">
        <span className="create-plus" aria-hidden="true">
          +
        </span>
        <span>{t.createNewDeck}</span>
      </Link>
      <Link href="/library/import" className="import-link">
        ⇪ {t.importDeck}
      </Link>
    </div>
  );
}
