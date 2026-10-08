"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { compareCards, type CardSort } from "@/lib/cardSort";
import { dateLocale, formatDue } from "@/lib/dueDate";
import { fill } from "@/lib/practice";
import { cardKey, State } from "@/lib/srs/core";
import { isDeckEnabled, useSrsData } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { CardSortSelect } from "./CardSortSelect";

/** "Browse" on a deck's page: its cards in the card browser's table format, searchable and sortable. */
export function DeckCardsTable({ deck, editable }: { deck: Deck; editable: boolean }) {
  const { t: dict, lang } = useI18n();
  const t = dict.browser;
  const srs = useSrsData();
  const [sort, setSort] = useState<CardSort>("created-asc");
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (c: Deck["cards"][number]) => {
    const text = [c.prompt, c.answer, c.visualization, c.object, c.note, c.details].filter(Boolean).join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  };
  const ordered = deck.kind === "ordered";
  const enabled = isDeckEnabled(srs, deck.id);

  const rows = deck.cards
    .map((card, i) => ({
      card,
      position: i + 1,
      question: ordered ? fill(t.stop, { n: i + 1 }) : (card.prompt ?? ""),
      createdAt: card.createdAt ?? deck.createdAt,
      enabled,
      stored: srs.cards[cardKey(deck.id, card.id)],
    }))
    // A–Z on a memory route sorts by what's at each stop, since the "question" is just its number.
    .filter((r) => matches(r.card))
    .map((r) => ({ ...r, sortQuestion: ordered ? r.card.answer : r.question }))
    .sort((a, b) => compareCards({ ...a, question: a.sortQuestion }, { ...b, question: b.sortQuestion }, sort, lang));

  const due = (r: (typeof rows)[number]) => {
    if (!r.stored || r.stored.state === State.New) return t.stateNew;
    return formatDue(new Date(r.stored.due), lang);
  };

  const created = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(dateLocale(lang)) : "–");

  return (
    <>
      <div className="section-title-row">
        <h2 className="section-title" id="inside">
          {dict.deck.inside}
        </h2>
        <div className="inside-tools">
          <input type="search" className="inside-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} />
          <CardSortSelect value={sort} onChange={setSort} />
          {editable && (
            <Link href="/library/cards" className="tile-open">
              {t.editInBrowser}
            </Link>
          )}
        </div>
      </div>
      <div className="browser-table-wrap">
        <table className="browser-table">
          <thead>
            <tr>
              <th>{t.colQuestion}</th>
              <th>{t.colAnswer}</th>
              {enabled && <th className="col-due">{t.colDue}</th>}
              <th className="col-created">{t.colCreated}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={enabled ? 4 : 3} className="muted">
                  {t.noMatches}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.card.id}>
                <td title={r.question}>{r.question}</td>
                <td title={r.card.answer}>{r.card.answer}</td>
                {enabled && <td className="col-due">{due(r)}</td>}
                <td className="col-created">{created(r.card.createdAt ?? deck.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
