"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { saveEditedDeck, useAnyDeck } from "@/lib/editableDecks";
import type { Card, Deck } from "@/lib/types";

/**
 * Adds a card to a deck or edits one: question (associations only), answer, memory cue, note and an
 * optional "learn by" date. Used mid-study (CardDialog) and on /library/add. Everything the form doesn't
 * show (images, object, details, ...) is kept, and the card id never changes, so its schedule stays attached.
 */
export function CardForm(props: {
  /** Decks to choose from; with one deck there's no picker. */
  decks: Deck[];
  deckId: string;
  onDeckChange?: (deckId: string) => void;
  /** The card being edited; leave out to add a new one. */
  card?: Card;
  onSaved: (deck: Deck, card: Card) => void;
  /** Extra buttons next to Save (e.g. Close / Done). */
  actions?: React.ReactNode;
  autoFocus?: boolean;
}) {
  const { t: dict } = useI18n();
  const t = dict.cardForm;
  const tc = dict.creator;
  const deck = props.decks.find((d) => d.id === props.deckId) ?? props.decks[0];
  const ordered = deck?.kind === "ordered";
  const [form, setForm] = useState({
    prompt: props.card?.prompt ?? "",
    answer: props.card?.answer ?? "",
    visualization: props.card?.visualization ?? "",
    note: props.card?.note ?? "",
    dueBy: props.card?.dueBy ?? "",
  });
  const [saving, setSaving] = useState(false);
  if (!deck) return null;
  const valid = form.answer.trim() !== "" && (ordered || form.prompt.trim() !== "");
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  async function save() {
    if (!valid || saving) return;
    const base: Card = props.card ?? { id: crypto.randomUUID(), answer: "" };
    const card: Card = { ...base, answer: form.answer.trim() };
    if (!ordered) card.prompt = form.prompt.trim();
    for (const key of ["visualization", "note", "dueBy"] as const) {
      const value = form[key].trim();
      if (value) card[key] = value;
      else delete card[key];
    }
    const cards = props.card ? deck.cards.map((c) => (c.id === card.id ? card : c)) : [...deck.cards, card];
    setSaving(true);
    const updated = { ...deck, cards };
    await saveEditedDeck(updated);
    setSaving(false);
    props.onSaved(updated, card);
  }

  return (
    <form
      className="card-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        // Cmd+Enter (Ctrl+Enter on Windows) saves from any field, even the multi-line memory cue.
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void save();
        }
      }}
    >
      {props.decks.length > 1 && !props.card && (
        <div className="field">
          <label htmlFor="card-deck">{t.deckLabel}</label>
          <select id="card-deck" value={deck.id} onChange={(e) => props.onDeckChange?.(e.target.value)}>
            {props.decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {!ordered && (
        <div className="field">
          <label htmlFor="card-prompt">{tc.promptLabel}</label>
          <input id="card-prompt" type="text" autoFocus={props.autoFocus} value={form.prompt} onChange={(e) => set({ prompt: e.target.value })} />
        </div>
      )}
      <div className="field">
        <label htmlFor="card-answer">{ordered ? tc.answerLabelOrdered : tc.answerLabel}</label>
        <input id="card-answer" type="text" autoFocus={props.autoFocus && ordered} value={form.answer} onChange={(e) => set({ answer: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="card-cue">{tc.memoryQueueLabel}</label>
        <textarea id="card-cue" value={form.visualization} placeholder={tc.memoryQueuePlaceholder} onChange={(e) => set({ visualization: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="card-note">{tc.noteLabel}</label>
        <input id="card-note" type="text" value={form.note} onChange={(e) => set({ note: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="card-due">{t.dueByLabel}</label>
        <input id="card-due" type="date" value={form.dueBy} onChange={(e) => set({ dueBy: e.target.value })} />
        <span className="hint">{t.dueByHint}</span>
      </div>
      <div className="controls left">
        <button type="submit" className="btn accent" disabled={!valid || saving} title={t.saveShortcut}>
          {saving ? t.saving : t.save} <kbd>⌘ ↵</kbd>
        </button>
        {props.actions}
      </div>
    </form>
  );
}

/**
 * CardForm in a dialog over a study session (E edits the current card, A adds one). Takes a deck id, not
 * the session's deck, because a session may show only one chapter and saving must keep the whole deck.
 */
export function CardDialog(props: { deckId: string; card?: Card; onClose: (saved: boolean) => void }) {
  const t = useI18n().t.cardForm;
  const deck = useAnyDeck(props.deckId);
  if (!deck) return null;
  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose(false);
      }}
      onKeyDown={(e) => {
        // Keep the session's shortcuts (Space, 1-4, ...) from firing while typing here.
        e.stopPropagation();
        if (e.key === "Escape") props.onClose(false);
      }}
    >
      <div className="dialog face" role="dialog" aria-modal="true" aria-label={props.card ? t.editTitle : t.addTitle}>
        <h2>{props.card ? t.editTitle : t.addTitle}</h2>
        <p className="muted">{deck.title}</p>
        <CardForm
          decks={[deck]}
          deckId={deck.id}
          card={props.card}
          autoFocus
          onSaved={() => props.onClose(true)}
          actions={
            <button type="button" className="btn nav" onClick={() => props.onClose(false)}>
              {t.close}
            </button>
          }
        />
      </div>
    </div>
  );
}
