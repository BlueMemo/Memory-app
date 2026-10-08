"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { dictionaries, languages, useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import { getDeck } from "@/decks";
import { resolveDeck, useDeckOverrides, useDeckOverridesStatus } from "@/lib/deckOverrides";
import { isSharedDeck, saveEditedDeck } from "@/lib/editableDecks";
import { readImageFile } from "@/lib/images";
import { toggleSavedDeck, useSavedDeckIds } from "@/lib/library";
import { fill } from "@/lib/practice";
import { isDeckEnabled, setDeckSrsEnabled, useSrsData } from "@/lib/srs/store";
import { useMounted } from "@/lib/useMounted";
import { addUserDeck, useUserDeck } from "@/lib/userDecks";
import type { Card, Deck, Lang } from "@/lib/types";
import { answerModeOf, majorityAnswerMode, type AnswerMode } from "@/lib/typedAnswer";
import { CardFormTour } from "./CoachTour";
import { DeckNotFound } from "./DeckNotFound";
import { AnswerStyleToggle } from "./TypedAnswer";

type WizardStep = "details" | "cards" | "review";
type Kind = Deck["kind"];
type T = Dict["creator"];

export function DeckCreatorView({ editDeckId }: { editDeckId?: string }) {
  if (!editDeckId) return <DeckCreatorForm />;
  return <EditDeckLoader deckId={editDeckId} />;
}

function EditDeckLoader({ deckId }: { deckId: string }) {
  const userDeck = useUserDeck(deckId);
  const official = getDeck(deckId);
  const overrides = useDeckOverrides();
  const overridesStatus = useDeckOverridesStatus();
  const mounted = useMounted();
  if (!mounted) return null;
  if (official) {
    // Editing a shared deck edits the learner's personal version of it (or starts one from the original).
    if (overridesStatus === "loading") return null;
    const deck = resolveDeck(official, overrides);
    return <DeckCreatorForm key={deck.id} initialDeck={deck} />;
  }
  if (userDeck) return <DeckCreatorForm key={userDeck.id} initialDeck={userDeck} />;
  return <DeckNotFound />;
}

function DeckCreatorForm({ initialDeck }: { initialDeck?: Deck }) {
  const { lang: siteLang, t: dict } = useI18n();
  const t = dict.creator;
  const router = useRouter();
  const editing = !!initialDeck;

  const [step, setStep] = useState<WizardStep>("details");
  const [title, setTitle] = useState(initialDeck?.title ?? "");
  const [description, setDescription] = useState(initialDeck?.description ?? "");
  const [kind, setKind] = useState<Kind>(initialDeck?.kind ?? "unordered");
  const [orderLabel, setOrderLabel] = useState(initialDeck?.orderLabel ?? "");
  const [language, setLanguage] = useState<Lang>(initialDeck?.language ?? siteLang);
  const [cards, setCards] = useState<Card[]>(initialDeck?.cards ?? []);
  // How cards you add are answered (each card keeps its own choice; this is the starting point).
  const [answerStyle, setAnswerStyle] = useState<AnswerMode>(() => majorityAnswerMode(initialDeck?.cards ?? []));
  const [saving, setSaving] = useState(false);
  // Until the learner flips the switch, follow the saved choice: the deck's current setting when editing,
  // otherwise the "use spaced repetition for new decks" default. (Derived rather than copied into state,
  // since saved settings may still be loading on the first render.)
  const srs = useSrsData();
  const srsSaved = initialDeck ? isDeckEnabled(srs, initialDeck.id) : srs.settings.enableForNewDecks;
  const [srsChoice, setSrsChoice] = useState<boolean | null>(null);
  const srsOn = srsChoice ?? srsSaved;
  const savedIds = useSavedDeckIds();

  const detailsValid = title.trim() !== "";

  const finalize = async () => {
    const defaultInstructions =
      kind === "ordered"
        ? [t.defaultInstructionsOrdered1, t.defaultInstructionsOrdered2]
        : [t.defaultInstructionsUnordered1, t.defaultInstructionsUnordered2];
    // Keep whatever this form doesn't edit (e.g. an official deck's notes, test questions and own
    // instructions); only switch to the default instructions when the deck changes kind.
    const deck: Deck = {
      ...initialDeck,
      id: initialDeck?.id ?? `user-${crypto.randomUUID()}`,
      title: title.trim(),
      description: description.trim(),
      language,
      kind,
      instructions: initialDeck && initialDeck.kind === kind ? initialDeck.instructions : defaultInstructions,
      cards,
    };
    if (kind === "ordered" && orderLabel.trim()) deck.orderLabel = orderLabel.trim();
    else delete deck.orderLabel;
    setSaving(true);
    if (editing) {
      await saveEditedDeck(deck);
      // Editing a shared deck makes it the learner's, so make sure it's in their library.
      if (isSharedDeck(deck.id) && !savedIds.includes(deck.id)) await toggleSavedDeck(deck.id);
    } else {
      await addUserDeck(deck);
    }
    if (!editing || srsOn !== srsSaved) await setDeckSrsEnabled(deck.id, srsOn);
    router.push(`/decks/${deck.id}`);
  };

  return (
    <main className="page">
      <h1 className="deck-title">{editing ? t.editTitle : t.title}</h1>
      <div className="tags wizard-steps">
        <span className={`tag${step === "details" ? " accent" : ""}`}>{t.stepDetails}</span>
        <span className={`tag${step === "cards" ? " accent" : ""}`}>{t.stepCards}</span>
        <span className={`tag${step === "review" ? " accent" : ""}`}>{t.stepReview}</span>
      </div>

      {step === "details" && (
        <DetailsStep
          t={t}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          kind={kind}
          setKind={setKind}
          orderLabel={orderLabel}
          setOrderLabel={setOrderLabel}
          language={language}
          setLanguage={setLanguage}
          srsOn={srsOn}
          setSrsOn={setSrsChoice}
          answerStyle={answerStyle}
          setAnswerStyle={setAnswerStyle}
          canNext={detailsValid}
          onNext={() => setStep("cards")}
        />
      )}

      {step === "cards" && (
        <CardsStep
          t={t}
          kind={kind}
          cards={cards}
          setCards={setCards}
          answerStyle={answerStyle}
          setAnswerStyle={setAnswerStyle}
          onBack={() => setStep("details")}
          onNext={() => setStep("review")}
        />
      )}

      {step === "review" && (
        <ReviewStep
          t={t}
          title={title}
          description={description}
          kind={kind}
          cards={cards}
          submitLabel={editing ? t.saveChanges : t.createDeck}
          submitting={saving}
          onBack={() => setStep("cards")}
          onCreate={finalize}
        />
      )}
    </main>
  );
}

function DetailsStep(props: {
  t: T;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  kind: Kind;
  setKind: (k: Kind) => void;
  orderLabel: string;
  setOrderLabel: (v: string) => void;
  language: Lang;
  setLanguage: (l: Lang) => void;
  srsOn: boolean;
  setSrsOn: (on: boolean) => void;
  answerStyle: AnswerMode;
  setAnswerStyle: (mode: AnswerMode) => void;
  canNext: boolean;
  onNext: () => void;
}) {
  const { t, title, setTitle, description, setDescription, kind, setKind, orderLabel, setOrderLabel, language, setLanguage, srsOn, setSrsOn, answerStyle, setAnswerStyle, canNext, onNext } =
    props;
  const ta = useI18n().t.answerStyle;
  return (
    <section>
      <div className="field">
        <label htmlFor="deck-title">{t.titleLabel}</label>
        <input id="deck-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} />
      </div>

      <div className="field">
        <label htmlFor="deck-description">{t.descriptionLabel}</label>
        <textarea
          id="deck-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.descriptionPlaceholder}
        />
      </div>

      <div className="field">
        <label>{t.kindLabel}</label>
        <div className="kind-options">
          <button
            type="button"
            className={`kind-option${kind === "unordered" ? " selected" : ""}`}
            onClick={() => setKind("unordered")}
          >
            <strong>{t.kindUnorderedTitle}</strong>
            <span>{t.kindUnorderedText}</span>
          </button>
          <button
            type="button"
            className={`kind-option${kind === "ordered" ? " selected" : ""}`}
            onClick={() => setKind("ordered")}
          >
            <strong>{t.kindOrderedTitle}</strong>
            <span>{t.kindOrderedText}</span>
          </button>
        </div>
      </div>

      {kind === "ordered" && (
        <div className="field">
          <label htmlFor="deck-order-label">{t.orderLabelLabel}</label>
          <input
            id="deck-order-label"
            type="text"
            value={orderLabel}
            onChange={(e) => setOrderLabel(e.target.value)}
            placeholder={t.orderLabelPlaceholder}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="deck-language">{t.languageLabel}</label>
        <select id="deck-language" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
          {languages.map((l) => (
            <option key={l} value={l}>
              {dictionaries[l].languageName}
            </option>
          ))}
        </select>
      </div>

      <AnswerStyleToggle value={answerStyle} onChange={setAnswerStyle} label={ta.detailsLabel} hint={ta.detailsHint} />

      <label className="check-field">
        <input type="checkbox" checked={srsOn} onChange={(e) => setSrsOn(e.target.checked)} />
        <span>
          <strong>{t.useSrsLabel}</strong>
          <span className="hint">{t.useSrsText}</span>
        </span>
      </label>

      <div className="controls left">
        <button className="btn accent" disabled={!canNext} onClick={onNext}>
          {t.next}
        </button>
      </div>
    </section>
  );
}

const emptyForm = { prompt: "", answer: "", visualization: "", note: "" };

function CardsStep({
  t,
  kind,
  cards,
  setCards,
  answerStyle,
  setAnswerStyle,
  onBack,
  onNext,
}: {
  t: T;
  kind: Kind;
  cards: Card[];
  setCards: (cards: Card[]) => void;
  answerStyle: AnswerMode;
  setAnswerStyle: (mode: AnswerMode) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const ordered = kind === "ordered";
  const ta = useI18n().t.answerStyle;
  // While editing a card the toggle shows that card's choice; the starting choice for new cards comes back afterwards.
  const modeBeforeEdit = useRef<AnswerMode>(answerStyle);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [promptImage, setPromptImage] = useState<string | undefined>();
  const [answerImage, setAnswerImage] = useState<string | undefined>();
  const [visualizationImage, setVisualizationImage] = useState<string | undefined>();

  const canSubmit = form.answer.trim() !== "" && (ordered || form.prompt.trim() !== "");

  const resetForm = () => {
    setForm(emptyForm);
    setPromptImage(undefined);
    setAnswerImage(undefined);
    setVisualizationImage(undefined);
  };

  const startEdit = (card: Card) => {
    if (!editingId) modeBeforeEdit.current = answerStyle;
    setAnswerStyle(answerModeOf(card));
    setEditingId(card.id);
    setForm({ prompt: card.prompt ?? "", answer: card.answer, visualization: card.visualization ?? "", note: card.note ?? "" });
    setPromptImage(card.promptImage);
    setAnswerImage(card.answerImage);
    setVisualizationImage(card.visualizationImage);
    firstFieldRef.current?.focus();
  };

  const cancelEdit = () => {
    if (editingId) setAnswerStyle(modeBeforeEdit.current);
    setEditingId(null);
    resetForm();
  };

  const submitCard = () => {
    if (!canSubmit) return;
    // When editing, start from the existing card so fields this form doesn't show (e.g. an official
    // card's object, details or drawing) survive; the id stays, so its review schedule does too.
    const card: Card = {
      ...cards.find((c) => c.id === editingId),
      id: editingId ?? crypto.randomUUID(),
      answer: form.answer.trim(),
    };
    if (!editingId) card.createdAt = new Date().toISOString();
    const setOrClear = <K extends "prompt" | "visualization" | "note" | "promptImage" | "answerImage" | "visualizationImage">(
      key: K,
      value: string | undefined,
    ) => {
      if (value) card[key] = value;
      else delete card[key];
    };
    setOrClear("prompt", ordered ? undefined : form.prompt.trim());
    setOrClear("visualization", form.visualization.trim());
    setOrClear("note", form.note.trim());
    setOrClear("promptImage", promptImage);
    setOrClear("answerImage", answerImage);
    setOrClear("visualizationImage", visualizationImage);
    if (answerStyle === "type") card.answerMode = "type";
    else delete card.answerMode;
    if (editingId) setAnswerStyle(modeBeforeEdit.current);
    setCards(editingId ? cards.map((c) => (c.id === editingId ? card : c)) : [...cards, card]);
    setEditingId(null);
    resetForm();
    firstFieldRef.current?.focus();
  };

  const setAllModes = (mode: AnswerMode) => {
    setCards(
      cards.map((c) => {
        const next = { ...c };
        if (mode === "type") next.answerMode = "type";
        else delete next.answerMode;
        return next;
      }),
    );
    if (!editingId) setAnswerStyle(mode);
  };
  const removeCard = (id: string) => {
    setCards(cards.filter((c) => c.id !== id));
    if (editingId === id) cancelEdit();
  };
  const moveCard = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[index], next[j]] = [next[j], next[index]];
    setCards(next);
  };

  return (
    <section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitCard();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submitCard();
          }
        }}
      >
        <CardFormTour ordered={ordered} />
        {!ordered && (
          <div className="field" data-tour="card-prompt">
            <div className="field-label-row">
              <label htmlFor="card-prompt">{t.promptLabel}</label>
              <ImageAddButton t={t} title={t.promptImageLabel} value={promptImage} onChange={setPromptImage} />
            </div>
            <input
              id="card-prompt"
              ref={firstFieldRef}
              type="text"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder={t.promptPlaceholder}
            />
          </div>
        )}

        <div className="field" data-tour="card-answer">
          <div className="field-label-row">
            <label htmlFor="card-answer">{ordered ? t.answerLabelOrdered : t.answerLabel}</label>
            <ImageAddButton t={t} title={t.answerImageLabel} value={answerImage} onChange={setAnswerImage} />
          </div>
          <input
            id="card-answer"
            ref={ordered ? firstFieldRef : undefined}
            type="text"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            placeholder={t.answerPlaceholder}
          />
        </div>

        <AnswerStyleToggle value={answerStyle} onChange={setAnswerStyle} hint={editingId ? undefined : ta.cardHint} />

        <div className="field" data-tour="card-cue">
          <div className="field-label-row">
            <label htmlFor="card-visualization">{t.memoryQueueLabel}</label>
            <ImageAddButton t={t} title={t.memoryQueueImageLabel} value={visualizationImage} onChange={setVisualizationImage} />
          </div>
          <textarea
            id="card-visualization"
            value={form.visualization}
            onChange={(e) => setForm({ ...form, visualization: e.target.value })}
            placeholder={t.memoryQueuePlaceholder}
          />
          <span className="hint">{t.memoryQueueHint}</span>
        </div>

        <div className="field" data-tour="card-note">
          <label htmlFor="card-note">{t.noteLabel}</label>
          <input id="card-note" type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <div className="controls left">
          <button type="submit" className="btn accent" disabled={!canSubmit}>
            {editingId ? t.updateCard : t.addCard}
          </button>
          {editingId && (
            <button type="button" className="link-button" onClick={cancelEdit}>
              {t.cancelEdit}
            </button>
          )}
        </div>
        <p className="keys">{t.addCardKeys}</p>
      </form>

      <h2 className="section-title">{cards.length === 0 ? t.noCardsYet : fill(t.cardsAdded, { n: cards.length })}</h2>
      {cards.length > 0 && (
        <p className="bulk-answer-style">
          <span className="muted">{ta.setAll}</span>{" "}
          <button type="button" className="link-button inline" onClick={() => setAllModes("show")}>
            {ta.show}
          </button>{" "}
          <span className="muted">·</span>{" "}
          <button type="button" className="link-button inline" onClick={() => setAllModes("type")}>
            {ta.type}
          </button>
        </p>
      )}
      {cards.length > 0 && (
        <ul className="result-list">
          {cards.map((c, i) => (
            <li key={c.id}>
              <span className="muted">{i + 1}</span>
              <span>
                {ordered ? c.answer : `${c.prompt} → ${c.answer}`}
                {answerModeOf(c) === "type" && <span className="tag typed-tag">{ta.typedTag}</span>}
              </span>
              <span className="row-actions">
                <button type="button" className="icon-btn" title={t.editCard} onClick={() => startEdit(c)}>
                  ✎
                </button>
                {ordered && (
                  <>
                    <button type="button" className="icon-btn" title={t.moveUp} disabled={i === 0} onClick={() => moveCard(i, -1)}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title={t.moveDown}
                      disabled={i === cards.length - 1}
                      onClick={() => moveCard(i, 1)}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button type="button" className="icon-btn" title={t.removeCard} onClick={() => removeCard(c.id)}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="controls">
        <button className="btn nav" onClick={onBack}>
          {t.back}
        </button>
        <button className="btn accent" disabled={cards.length === 0} onClick={onNext}>
          {t.next}
        </button>
      </div>
    </section>
  );
}

/** A compact, optional-looking add-on next to a field's label, rather than a field of its own. */
function ImageAddButton({
  t,
  title,
  value,
  onChange,
}: {
  t: T;
  title: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <span className="image-add">
      {value ? (
        <span className="image-add-preview">
          <img src={value} alt="" />
          <button type="button" className="image-remove" title={t.removeImage} onClick={() => onChange(undefined)}>
            ×
          </button>
        </span>
      ) : (
        <button type="button" className="image-add-btn" title={title} onClick={() => inputRef.current?.click()}>
          + {t.chooseImage}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            onChange(await readImageFile(file));
          } catch {
            // Unreadable image file: leave the field as it was.
          }
        }}
      />
    </span>
  );
}

function ReviewStep({
  t,
  title,
  description,
  kind,
  cards,
  submitLabel,
  submitting,
  onBack,
  onCreate,
}: {
  t: T;
  title: string;
  description: string;
  kind: Kind;
  cards: Card[];
  submitLabel: string;
  submitting: boolean;
  onBack: () => void;
  onCreate: () => void;
}) {
  const ordered = kind === "ordered";
  return (
    <section>
      <h2 className="section-title">{t.reviewTitle}</h2>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <p className="muted">{fill(t.reviewCardCount, { n: cards.length })}</p>

      <ul className="result-list">
        {cards.map((c, i) => (
          <li key={c.id}>
            <span className="muted">{i + 1}</span>
            <span>{ordered ? c.answer : `${c.prompt} → ${c.answer}`}</span>
            <span />
          </li>
        ))}
      </ul>

      <div className="controls">
        <button className="btn nav" onClick={onBack} disabled={submitting}>
          {t.back}
        </button>
        <button className="btn accent" onClick={onCreate} disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </section>
  );
}
