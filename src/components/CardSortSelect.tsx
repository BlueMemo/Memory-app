"use client";

import { useI18n } from "@/i18n";
import { CARD_SORTS, type CardSort } from "@/lib/cardSort";

/** The sort menu for card lists: due date, A–Z, created, each with its reverse. */
export function CardSortSelect({ value, onChange }: { value: CardSort; onChange: (sort: CardSort) => void }) {
  const t = useI18n().t.browser;
  const labels: Record<CardSort, string> = {
    "due-asc": t.sortDueAsc,
    "due-desc": t.sortDueDesc,
    az: t.sortAz,
    za: t.sortZa,
    "created-asc": t.sortCreatedAsc,
    "created-desc": t.sortCreatedDesc,
  };
  return (
    <label className="sort-select">
      <span>{t.sortLabel}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as CardSort)}>
        {CARD_SORTS.map((s) => (
          <option key={s} value={s}>
            {labels[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
