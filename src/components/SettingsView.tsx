"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { DEFAULT_SETTINGS, parseSteps, SETTINGS_LIMITS, type SrsSettings } from "@/lib/srs/core";
import { updateSrsSettings, useSrsData, useSrsSignedIn, useSrsStatus } from "@/lib/srs/store";

export function SettingsView() {
  const t = useI18n().t.settings;
  const { settings } = useSrsData();
  const status = useSrsStatus();
  const signedIn = useSrsSignedIn();
  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{t.title}</h1>
      </section>
      {/* Remount when the settings source changes (signing in or out), so the form starts from the right values,
          but not on our own saves, which would wipe the "Saved." note. */}
      {status !== "loading" && <SrsSettingsForm key={signedIn ? "account" : "browser"} saved={settings} />}
    </main>
  );
}

function SrsSettingsForm({ saved }: { saved: SrsSettings }) {
  const t = useI18n().t.settings;
  const signedIn = useSrsSignedIn();
  const [form, setForm] = useState(saved);
  const [justSaved, setJustSaved] = useState(false);

  const learningOk = parseSteps(form.learningSteps) !== null;
  const relearningOk = parseSteps(form.relearningSteps) !== null;
  const set = (patch: Partial<SrsSettings>) => {
    setForm({ ...form, ...patch });
    setJustSaved(false);
  };
  const number = (key: keyof typeof SETTINGS_LIMITS, value: string) => set({ [key]: value === "" ? NaN : Number(value) });

  return (
    <form
      className="settings-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!learningOk || !relearningOk) return;
        await updateSrsSettings(form);
        setJustSaved(true);
      }}
    >
      <h2>{t.srsTitle}</h2>
      <p className="muted">{t.srsLead}</p>

      <label className="check-field">
        <input type="checkbox" checked={form.enableForNewDecks} onChange={(e) => set({ enableForNewDecks: e.target.checked })} />
        <span>
          <strong>{t.enableForNewDecks}</strong>
          <span className="hint">{t.enableForNewDecksHint}</span>
        </span>
      </label>

      <div className="field-row">
        <NumberField id="new-per-day" label={t.newPerDay} value={form.newPerDay} limits={SETTINGS_LIMITS.newPerDay} onChange={(v) => number("newPerDay", v)} />
        <NumberField id="reviews-per-day" label={t.reviewsPerDay} value={form.reviewsPerDay} limits={SETTINGS_LIMITS.reviewsPerDay} onChange={(v) => number("reviewsPerDay", v)} />
      </div>
      <span className="hint">{t.limitsHint}</span>

      <NumberField
        id="retention"
        label={t.desiredRetention}
        hint={t.desiredRetentionHint}
        value={form.desiredRetention}
        limits={SETTINGS_LIMITS.desiredRetention}
        step={0.01}
        onChange={(v) => number("desiredRetention", v)}
      />

      <div className="field">
        <label htmlFor="learning-steps">{t.learningSteps}</label>
        <input id="learning-steps" type="text" value={form.learningSteps} aria-invalid={!learningOk} onChange={(e) => set({ learningSteps: e.target.value })} />
        <span className={`hint${learningOk ? "" : " error"}`}>{learningOk ? t.learningStepsHint : t.invalidSteps}</span>
      </div>

      <div className="field">
        <label htmlFor="relearning-steps">{t.relearningSteps}</label>
        <input id="relearning-steps" type="text" value={form.relearningSteps} aria-invalid={!relearningOk} onChange={(e) => set({ relearningSteps: e.target.value })} />
        <span className={`hint${relearningOk ? "" : " error"}`}>{relearningOk ? t.relearningStepsHint : t.invalidSteps}</span>
      </div>

      <NumberField id="max-interval" label={t.maximumInterval} value={form.maximumInterval} limits={SETTINGS_LIMITS.maximumInterval} onChange={(v) => number("maximumInterval", v)} />

      <div className="controls left">
        <button type="submit" className="btn accent" disabled={!learningOk || !relearningOk}>
          {t.save}
        </button>
        <button type="button" className="link-button" onClick={() => set({ ...DEFAULT_SETTINGS, enableForNewDecks: form.enableForNewDecks })}>
          {t.resetDefaults}
        </button>
        {justSaved && <span className="saved-note">{t.saved}</span>}
      </div>
      {!signedIn && <p className="fine-print">{t.storedLocal}</p>}
    </form>
  );
}

function NumberField(props: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  limits: { min: number; max: number };
  step?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        type="number"
        inputMode="decimal"
        min={props.limits.min}
        max={props.limits.max}
        step={props.step ?? 1}
        value={Number.isNaN(props.value) ? "" : props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && <span className="hint">{props.hint}</span>}
    </div>
  );
}
