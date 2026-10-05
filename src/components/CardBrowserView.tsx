"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import { fill } from "@/lib/practice";
import { cardKey, formatInterval, nextDayStart, State, type StoredCard } from "@/lib/srs/core";
import { forgetCard, isDeckEnabled, useSrsData } from "@/lib/srs/store";
import type { Card, Deck } from "@/lib/types";
import { compareCards, type CardSort } from "@/lib/cardSort";
import { saveEditedDeck, useEditableDecks } from "@/lib/editableDecks";
import { useMounted } from "@/lib/useMounted";
import { useNow } from "@/lib/useNow";
import { CardSortSelect } from "./CardSortSelect";

type Filter = "all" | "due" | "new" | "learning" | "review";

interface Row {
  key: string;
  deck: Deck;
  card: Card;
  position: number;
  /** Across all decks, in library order: what "Created" sorts by. */
  order: number;
  enabled: boolean;
  stored?: StoredCard;
}

const searchText = (c: Card) => [c.prompt, c.answer, c.visualization, c.object, c.note, c.details].filter(Boolean).join(" ").toLowerCase();

/**
 * Like Anki's browser: every card in the learner's decks — ones they created and ones they saved, treated
 * alike — searchable, with an editor for the selected card.
 */
export function CardBrowserView() {
  const { t: dict, lang } = useI18n();
  const t = dict.browser;
  const decks = useEditableDecks();
  const srs = useSrsData();
  const mounted = useMounted();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [deckFilter, setDeckFilter] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<CardSort>("created-asc");
  const [selected, setSelected] = useState<string | null>(null);

  const endOfDay = nextDayStart(now).getTime();
  const rows: Row[] = decks
    .flatMap((deck) =>
      deck.cards.map((card, i) => ({
        key: cardKey(deck.id, card.id),
        deck,
        card,
        position: i + 1,
        order: 0,
        enabled: isDeckEnabled(srs, deck.id),
        stored: srs.cards[cardKey(deck.id, card.id)],
      })),
    )
    .map((r, i) => ({ ...r, order: i }));

  const matches = (r: Row) => {
    if (deckFilter !== "all" && r.deck.id !== deckFilter) return false;
    if (query && !searchText(r.card).includes(query.toLowerCase())) return false;
    const state = r.stored?.state ?? State.New;
    switch (filter) {
      case "due":
        return r.enabled && !!r.stored && state !== State.New && new Date(r.stored.due).getTime() < endOfDay;
      case "new":
        return state === State.New;
      case "learning":
        return state === State.Learning || state === State.Relearning;
      case "review":
        return state === State.Review;
      default:
        return true;
    }
  };

  const question = (r: Row) => (r.deck.kind === "ordered" ? fill(t.stop, { n: r.position }) : (r.card.prompt ?? ""));
  // Same sort orders as a deck's "What's inside" table; A–Z on a memory route uses what's at the stop.
  const sortable = (r: Row) => ({
    question: r.deck.kind === "ordered" ? r.card.answer : question(r),
    position: r.order + 1,
    createdAt: r.card.createdAt,
    enabled: r.enabled,
    stored: r.stored,
  });
  const visible = rows.filter(matches).sort((a, b) => compareCards(sortable(a), sortable(b), sort, lang));
  const selectedRow = rows.find((r) => r.key === selected);

  const dueLabel = (r: Row) => {
    if (!r.enabled) return "—";
    if (!r.stored || r.stored.state === State.New) return t.stateNew;
    const ms = new Date(r.stored.due).getTime() - now.getTime();
    return ms <= 0 ? dict.srs.now : fill(dict.srs.inTime, { time: formatInterval(ms, dict.srs.units) });
  };

  if (!mounted) return null;

  return (
    <main className="page wide">
      <Link href="/library" className="link-muted">
        {dict.deck.backToLibrary}
      </Link>
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      {decks.length === 0 ? (
        <div className="empty-state">
          <p>{t.noDecks}</p>
          <Link href="/library/new" className="tile-open">
            {t.createDeck}
          </Link>
        </div>
      ) : (
        <div className="browser">
          <div className="browser-list">
            <div className="browser-filters">
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchPlaceholder} />
              <select value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)} aria-label={t.colDeck}>
                <option value="all">{t.allDecks}</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
              <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label={t.filterAll}>
                <option value="all">{t.filterAll}</option>
                <option value="due">{t.filterDue}</option>
                <option value="new">{t.filterNew}</option>
                <option value="learning">{t.filterLearning}</option>
                <option value="review">{t.filterReview}</option>
              </select>
              <CardSortSelect value={sort} onChange={setSort} />
            </div>
            <p className="muted browser-count">{fill(t.count, { n: visible.length })}</p>
            <div className="table-wrap">
              <table className="browser-table">
                <thead>
                  <tr>
                    <th>{t.colQuestion}</th>
                    <th>{t.colAnswer}</th>
                    <th className="col-deck">{t.colDeck}</th>
                    <th className="col-due">{t.colDue}</th>
                    <th className="col-created">{t.colCreated}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r.key}
                      className={r.key === selected ? "selected" : undefined}
                      onClick={() => setSelected(r.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(r.key);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={r.key === selected}
                    >
                      <td>{question(r)}</td>
                      <td>{r.card.answer}</td>
                      <td className="col-deck">{r.deck.title}</td>
                      <td className="col-due">{dueLabel(r)}</td>
                      <td className="col-created">{r.card.createdAt ? new Date(r.card.createdAt).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-GB") : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visible.length === 0 && <p className="muted browser-empty">{t.noCards}</p>}
            </div>
          </div>

          <aside className="browser-editor">
            {selectedRow ? (
              <CardEditor key={selectedRow.key} row={selectedRow} now={now} dict={dict} onDeleted={() => setSelected(null)} />
            ) : (
              <p className="muted">{t.selectHint}</p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function CardEditor({ row, now, dict, onDeleted }: { row: Row; now: Date; dict: Dict; onDeleted: () => void }) {
  const t = dict.browser;
  const tc = dict.creator;
  const { deck, card, stored, enabled } = row;
  const ordered = deck.kind === "ordered";
  const [form, setForm] = useState({
    prompt: card.prompt ?? "",
    answer: card.answer,
    visualization: card.visualization ?? "",
    note: card.note ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const valid = form.answer.trim() !== "" && (ordered || form.prompt.trim() !== "");
  const hasImages = !!(card.promptImage || card.answerImage || card.visualizationImage);
  const set = (patch: Partial<typeof form>) => {
    setForm({ ...form, ...patch });
    setSaved(false);
  };

  const save = async () => {
    if (!valid) return;
    // Keep everything the form doesn't edit (images, object, details, ...); the card id stays the same,
    // so its spaced repetition schedule stays attached.
    const updated: Card = { ...card, answer: form.answer.trim() };
    if (!ordered) updated.prompt = form.prompt.trim();
    if (form.visualization.trim()) updated.visualization = form.visualization.trim();
    else delete updated.visualization;
    if (form.note.trim()) updated.note = form.note.trim();
    else delete updated.note;
    setSaving(true);
    await saveEditedDeck({ ...deck, cards: deck.cards.map((c) => (c.id === card.id ? updated : c)) });
    setSaving(false);
    setSaved(true);
  };

  const remove = async () => {
    if (!window.confirm(t.deleteConfirm)) return;
    await saveEditedDeck({ ...deck, cards: deck.cards.filter((c) => c.id !== card.id) });
    await forgetCard(deck.id, card.id);
    onDeleted();
  };

  const stateName = (s: State) =>
    ({ [State.New]: t.stateNew, [State.Learning]: t.stateLearning, [State.Review]: t.stateReview, [State.Relearning]: t.stateRelearning })[s];
  const dueIn = stored ? new Date(stored.due).getTime() - now.getTime() : 0;

  return (
    <form
      className="card-editor"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2>{t.editTitle}</h2>
      <p className="muted">
        {deck.title}
        {ordered && ` · ${fill(t.stop, { n: row.position })}`}
      </p>

      {!ordered && (
        <div className="field">
          <label htmlFor="edit-prompt">{tc.promptLabel}</label>
          <input id="edit-prompt" type="text" value={form.prompt} onChange={(e) => set({ prompt: e.target.value })} />
        </div>
      )}
      <div className="field">
        <label htmlFor="edit-answer">{ordered ? tc.answerLabelOrdered : tc.answerLabel}</label>
        <input id="edit-answer" type="text" value={form.answer} onChange={(e) => set({ answer: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="edit-visualization">{tc.memoryQueueLabel}</label>
        <textarea id="edit-visualization" value={form.visualization} onChange={(e) => set({ visualization: e.target.value })} placeholder={tc.memoryQueuePlaceholder} />
      </div>
      <div className="field">
        <label htmlFor="edit-note">{tc.noteLabel}</label>
        <input id="edit-note" type="text" value={form.note} onChange={(e) => set({ note: e.target.value })} />
      </div>
      {hasImages && (
        <p className="hint">
          {t.imagesNote}{" "}
          <Link href={`/library/edit/${deck.id}`} className="tile-open inline">
            {t.openDeckEditor}
          </Link>
        </p>
      )}

      <div className="controls left">
        <button type="submit" className="btn accent" disabled={!valid || saving}>
          {t.save}
        </button>
        {saved && <span className="saved-note">{t.saved}</span>}
      </div>

      <h3 className="section-title">{t.scheduling}</h3>
      {enabled ? (
        <>
          <dl className="sched-list">
            <dt>{t.state}</dt>
            <dd>{stored ? stateName(stored.state) : t.stateNew}</dd>
            {stored && stored.state !== State.New && (
              <>
                <dt>{t.due}</dt>
                <dd>
                  {new Date(stored.due).toLocaleString()} (
                  {dueIn <= 0 ? dict.srs.now : fill(dict.srs.inTime, { time: formatInterval(dueIn, dict.srs.units) })})
                </dd>
                <dt>{t.interval}</dt>
                <dd>{fill(t.days, { n: Math.round(stored.scheduledDays) })}</dd>
                <dt>{t.stability}</dt>
                <dd>{fill(t.days, { n: stored.stability.toFixed(1) })}</dd>
                <dt>{t.difficulty}</dt>
                <dd>{stored.difficulty.toFixed(1)} / 10</dd>
                <dt>{t.reviews}</dt>
                <dd>{stored.reps}</dd>
                <dt>{t.lapses}</dt>
                <dd>{stored.lapses}</dd>
              </>
            )}
          </dl>
          {stored && (
            <button type="button" className="btn nav" title={t.forgetHint} onClick={() => window.confirm(t.forgetConfirm) && forgetCard(deck.id, card.id)}>
              {t.forget}
            </button>
          )}
        </>
      ) : (
        <p className="muted">{t.srsOff}</p>
      )}

      <div className="editor-danger">
        <button type="button" className="link-button danger" onClick={remove} disabled={deck.cards.length <= 1} title={deck.cards.length <= 1 ? t.lastCardHint : undefined}>
          {t.deleteCard}
        </button>
      </div>
    </form>
  );
}
