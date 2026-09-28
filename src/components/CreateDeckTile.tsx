"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";

export function CreateDeckTile() {
  const t = useI18n().t.library;
  return (
    <Link href="/library/new" className="create-tile">
      <span className="create-plus" aria-hidden="true">
        +
      </span>
      <span>{t.createNewDeck}</span>
    </Link>
  );
}
