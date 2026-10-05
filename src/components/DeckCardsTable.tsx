"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { compareCards, type CardSort } from "@/lib/cardSort";
import { fill } from "@/lib/practice";
import { cardKey, formatInterval, State } from "@/lib/srs/core";
import { isDeckEnabled, useSrsData } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { CardSortSelect } from "./CardSortSelect";

/** A deck's cards on its page, in the card browser's table format, sortable by due date, A–Z or creation. */
export function DeckCardsTable({ deck, editable }: { deck: Deck; editable: boolean }) {
  const { t: dict, lang } = useI18n();
  const t = dict.browser;
  const srs = useSrsData();
  const now = useNow();
  const [sort, setSort] = useState<CardSort>("created-asc");
  const ordered = deck.kind === "ordered";
  const enabled = isDeckEnabled(srs, deck.id);

  const rows = deck.cards
    .map((card, i) => ({
      card,
      position: i + 1,
      question: ordered ? fill(t.stop, { n: i + 1 }) : (card.prompt ?? ""),
      enabled,
      stored: srs.cards[cardKey(deck.id, card.id)],
    }))
    // A–Z on a memory route sorts by what's at each stop, since the "question" is just its number.
    .map((r) => ({ ...r, sortQuestion: ordered ? r.card.answer : r.question }))
    .sort((a, b) => compareCards({ ...a, question: a.sortQuestion }, { ...b, question: b.sortQuestion }, sort, lang));

  const due = (r: (typeof rows)[number]) => {
    if (!r.stored || r.stored.state === State.New) return t.stateNew;
    const ms = new Date(r.stored.due).getTime() - now.getTime();
    return ms <= 0 ? dict.srs.now : fill(dict.srs.inTime, { time: formatInterval(ms, dict.srs.units) });
  };

  return (
    <>
      <div className="section-title-row">
        <h2 className="section-title" id="inside">
          {dict.deck.inside}
        </h2>
        <div className="inside-tools">
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.card.id}>
                <td>{r.question}</td>
                <td>{r.card.answer}</td>
                {enabled && <td className="col-due">{due(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
