"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { markTourSeen, useTourSeen, type TourId } from "@/lib/tours";

export interface TourStep {
  /** CSS selector of the element the box points at; steps whose element isn't on the page are left out. */
  target: string;
  title: string;
  text: string;
}

type Place = { top: number; left: number; arrowLeft: number; below: boolean };

const BOX_WIDTH = 300;
const GAP = 14;

/**
 * A white box with an arrow pointing at one element at a time, with Next / Got it and Skip. Marks the tour
 * seen when finished or skipped. The element pointed at gets a ring (`.coach-target`).
 */
export function CoachTour({ id, steps }: { id: TourId; steps: TourStep[] }) {
  const t = useI18n().t.tour;
  const [present, setPresent] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [place, setPlace] = useState<Place | null>(null);

  // Only the steps whose element exists (e.g. ordered decks have no question field).
  useEffect(() => {
    const timer = setTimeout(() => setPresent(steps.filter((s) => document.querySelector(s.target))), 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = present?.[index];
  const finish = useCallback(() => markTourSeen(id), [id]);

  const measure = useCallback(() => {
    const el = step && document.querySelector<HTMLElement>(step.target);
    if (!el) return setPlace(null);
    const r = el.getBoundingClientRect();
    const width = Math.min(BOX_WIDTH, window.innerWidth - 32);
    const left = Math.max(16, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 16));
    const below = r.bottom + 200 < window.innerHeight || r.top < 220;
    setPlace({ top: below ? r.bottom + GAP : r.top - GAP, left, arrowLeft: r.left + r.width / 2 - left, below });
  }, [step]);

  useEffect(() => {
    const el = step && document.querySelector<HTMLElement>(step.target);
    if (!el) return;
    el.classList.add("coach-target");
    el.scrollIntoView({ block: "nearest" });
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      el.classList.remove("coach-target");
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  useEffect(() => {
    if (present && present.length === 0) finish();
  }, [present, finish]);

  if (!step || !place || !present) return null;
  const last = index === present.length - 1;
  return (
    <div
      className={`coach-box${place.below ? " below" : " above"}`}
      role="dialog"
      aria-live="polite"
      aria-label={step.title}
      style={{ top: place.top, left: place.left, width: Math.min(BOX_WIDTH, window.innerWidth - 32) }}
    >
      <span className="coach-arrow" style={{ left: Math.max(16, Math.min(place.arrowLeft, BOX_WIDTH - 16)) }} aria-hidden="true" />
      <p className="coach-count">{fill(t.count, { n: index + 1, total: present.length })}</p>
      <h2>{step.title}</h2>
      <p>{step.text}</p>
      <div className="coach-actions">
        {!last && (
          <button type="button" className="coach-skip" onClick={finish}>
            {t.skip}
          </button>
        )}
        {index > 0 && (
          <button type="button" className="coach-back" onClick={() => setIndex(index - 1)}>
            {t.back}
          </button>
        )}
        <button type="button" className="coach-next" onClick={() => (last ? finish() : setIndex(index + 1))}>
          {last ? t.done : t.next}
        </button>
      </div>
    </div>
  );
}

/**
 * The card form's tour (question, answer, memory cue, learn-by date, note), shared by every card form: quick
 * add, A/E while studying, and the deck creator's card step. Fields a form doesn't have are left out.
 */
export function CardFormTour({ ordered }: { ordered: boolean }) {
  const t = useI18n().t.tour;
  const seen = useTourSeen("cardForm");
  if (seen) return null;
  return (
    <CoachTour
      id="cardForm"
      steps={[
        { target: '[data-tour="card-prompt"]', title: t.promptTitle, text: t.promptText },
        { target: '[data-tour="card-answer"]', title: t.answerTitle, text: ordered ? t.answerTextOrdered : t.answerText },
        { target: '[data-tour="card-cue"]', title: t.cueTitle, text: t.cueText },
        { target: '[data-tour="card-due"]', title: t.dueTitle, text: t.dueText },
        { target: '[data-tour="card-note"]', title: t.noteTitle, text: t.noteText },
      ]}
    />
  );
}
