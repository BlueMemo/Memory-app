"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { dictionaries, languages, useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import { fill } from "@/lib/practice";
import { addUserDeck } from "@/lib/userDecks";
import type { Card, Deck, Lang } from "@/lib/types";

type WizardStep = "details" | "cards" | "review";
type Kind = Deck["kind"];
type T = Dict["creator"];

export function DeckCreatorView() {
  const { lang: siteLang, t: dict } = useI18n();
  const t = dict.creator;
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<Kind>("unordered");
  const [orderLabel, setOrderLabel] = useState("");
  const [language, setLanguage] = useState<Lang>(siteLang);
  const [cards, setCards] = useState<Card[]>([]);

  const detailsValid = title.trim() !== "" && description.trim() !== "";

  const createDeck = () => {
    const deck: Deck = {
      id: `user-${crypto.randomUUID()}`,
      title: title.trim(),
      description: description.trim(),
      language,
      kind,
      ...(kind === "ordered" && orderLabel.trim() ? { orderLabel: orderLabel.trim() } : {}),
      instructions:
        kind === "ordered"
          ? [t.defaultInstructionsOrdered1, t.defaultInstructionsOrdered2]
          : [t.defaultInstructionsUnordered1, t.defaultInstructionsUnordered2],
      cards,
    };
    addUserDeck(deck);
    router.push(`/decks/${deck.id}`);
  };

  return (
    <main className="page">
      <h1 className="deck-title">{t.title}</h1>
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
          onBack={() => setStep("cards")}
          onCreate={createDeck}
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
  canNext: boolean;
  onNext: () => void;
}) {
  const { t, title, setTitle, description, setDescription, kind, setKind, orderLabel, setOrderLabel, language, setLanguage, canNext, onNext } =
    props;
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

      <div className="controls left">
        <button className="btn accent" disabled={!canNext} onClick={onNext}>
          {t.next}
        </button>
      </div>
    </section>
  );
}

function CardsStep({
  t,
  kind,
  cards,
  setCards,
  onBack,
  onNext,
}: {
  t: T;
  kind: Kind;
  cards: Card[];
  setCards: (cards: Card[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const ordered = kind === "ordered";
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [object, setObject] = useState("");
  const [visualization, setVisualization] = useState("");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");

  const canAdd = answer.trim() !== "" && (ordered || prompt.trim() !== "");

  const addCard = () => {
    if (!canAdd) return;
    const card: Card = {
      id: crypto.randomUUID(),
      answer: answer.trim(),
      ...(ordered ? {} : { prompt: prompt.trim() }),
      ...(object.trim() ? { object: object.trim() } : {}),
      ...(visualization.trim() ? { visualization: visualization.trim() } : {}),
      ...(details.trim() ? { details: details.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    setCards([...cards, card]);
    setPrompt("");
    setAnswer("");
    setObject("");
    setVisualization("");
    setDetails("");
    setNote("");
    firstFieldRef.current?.focus();
  };

  const removeCard = (id: string) => setCards(cards.filter((c) => c.id !== id));
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
          addCard();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            addCard();
          }
        }}
      >
        {!ordered && (
          <div className="field">
            <label htmlFor="card-prompt">{t.promptLabel}</label>
            <input
              id="card-prompt"
              ref={firstFieldRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="card-answer">{ordered ? t.answerLabelOrdered : t.answerLabel}</label>
          <input
            id="card-answer"
            ref={ordered ? firstFieldRef : undefined}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t.answerPlaceholder}
          />
        </div>
        <div className="field">
          <label htmlFor="card-object">{t.objectLabel}</label>
          <input id="card-object" type="text" value={object} onChange={(e) => setObject(e.target.value)} placeholder={t.objectPlaceholder} />
          <span className="hint">{t.objectHint}</span>
        </div>
        <div className="field">
          <label htmlFor="card-visualization">{t.visualizationLabel}</label>
          <textarea
            id="card-visualization"
            value={visualization}
            onChange={(e) => setVisualization(e.target.value)}
            placeholder={t.visualizationPlaceholder}
          />
        </div>
        <div className="field">
          <label htmlFor="card-details">{t.detailsLabel}</label>
          <input id="card-details" type="text" value={details} onChange={(e) => setDetails(e.target.value)} placeholder={t.detailsPlaceholder} />
        </div>
        <div className="field">
          <label htmlFor="card-note">{t.noteLabel}</label>
          <input id="card-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="controls left">
          <button type="submit" className="btn accent" disabled={!canAdd}>
            {t.addCard}
          </button>
        </div>
        <p className="keys">{t.addCardKeys}</p>
      </form>

      <h2 className="section-title">{cards.length === 0 ? t.noCardsYet : fill(t.cardsAdded, { n: cards.length })}</h2>
      {cards.length > 0 && (
        <ul className="result-list">
          {cards.map((c, i) => (
            <li key={c.id}>
              <span className="muted">{i + 1}</span>
              <span>{ordered ? c.answer : `${c.prompt} → ${c.answer}`}</span>
              <span className="row-actions">
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

function ReviewStep({
  t,
  title,
  description,
  kind,
  cards,
  onBack,
  onCreate,
}: {
  t: T;
  title: string;
  description: string;
  kind: Kind;
  cards: Card[];
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
        <button className="btn nav" onClick={onBack}>
          {t.back}
        </button>
        <button className="btn accent" onClick={onCreate}>
          {t.createDeck}
        </button>
      </div>
    </section>
  );
}
