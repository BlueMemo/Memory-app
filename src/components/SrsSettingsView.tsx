"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { resolveDeck, useDeckOverrides } from "@/lib/deckOverrides";
import { useSavedDecks } from "@/lib/editableDecks";
import { fill } from "@/lib/practice";
import {
  DECK_OPTION_KEYS,
  DEFAULT_SETTINGS,
  deckOptionChanges,
  parseStep,
  parseSteps,
  settingsForDeck,
  SETTINGS_LIMITS,
  type DeckOptions,
  type SrsSettings,
} from "@/lib/srs/core";
import { AUTO_OPTIMIZE_EVERY, countReviews, MIN_REVIEWS_TO_OPTIMIZE, optimizeParameters } from "@/lib/srs/optimize";
import { updateSrsSettings, useSrsData, useSrsSignedIn, useSrsStatus } from "@/lib/srs/store";
import { useUserDecks } from "@/lib/userDecks";
import type { Deck } from "@/lib/types";

type T = ReturnType<typeof useI18n>["t"]["srsSettings"];

/** Just the per-deck options of a settings object. */
const deckOptionsOf = (s: DeckOptions): DeckOptions =>
  Object.fromEntries(DECK_OPTION_KEYS.map((k) => [k, s[k]])) as unknown as DeckOptions;

/**
 * /library/settings: spaced repetition options. The defaults apply to every deck; `?deck=<id>` opens one
 * deck's own options (reached from that deck's spaced repetition panel). Personal optimisation is global.
 */
export function SrsSettingsView({ deckId }: { deckId: string | null }) {
  const t = useI18n().t.srsSettings;
  const router = useRouter();
  const { settings, enabled } = useSrsData();
  const status = useSrsStatus();
  const signedIn = useSrsSignedIn();
  const decks = useDecksWithSrs(enabled, settings);
  const deck = deckId ? decks.find((d) => d.id === deckId) ?? null : null;

  return (
    <main className="page narrow">
      <Link href="/library" className="link-muted">
        {t.backToLibrary}
      </Link>
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      {decks.length > 0 && (
        <div className="field">
          <label htmlFor="srs-scope">{t.scope}</label>
          <select
            id="srs-scope"
            value={deck?.id ?? ""}
            onChange={(e) => router.replace(e.target.value ? `/library/settings?deck=${encodeURIComponent(e.target.value)}` : "/library/settings")}
          >
            <option value="">{t.scopeAll}</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Remount when the source of the values changes (signing in or out, or another deck), so the form
          starts from the right values, but not on our own saves, which would wipe the "Saved." note. */}
      {status !== "loading" && (
        <OptionsForm key={`${signedIn ? "account" : "browser"}:${deck?.id ?? ""}`} settings={settings} deck={deck} t={t} />
      )}
      {status !== "loading" && <Optimizer settings={settings} signedIn={signedIn} t={t} />}
      {!signedIn && <p className="fine-print">{t.storedLocal}</p>}
    </main>
  );
}

/** Decks the learner could give their own options: those with spaced repetition on, or already customised. */
function useDecksWithSrs(enabled: Record<string, boolean>, settings: SrsSettings): Deck[] {
  const userDecks = useUserDecks();
  const savedDecks = useSavedDecks();
  const overrides = useDeckOverrides();
  const all = new Map<string, Deck>();
  for (const d of [...userDecks, ...savedDecks, ...officialDecks.map((o) => resolveDeck(o, overrides))]) {
    if (!all.has(d.id)) all.set(d.id, d);
  }
  return [...all.values()]
    .filter((d) => enabled[d.id] === true || settings.deckOverrides[d.id] !== undefined)
    .sort((a, b) => a.title.localeCompare(b.title));
}

function OptionsForm({ settings, deck, t }: { settings: SrsSettings; deck: Deck | null; t: T }) {
  const startCustom = deck ? settings.deckOverrides[deck.id] !== undefined : true;
  const [custom, setCustom] = useState(startCustom);
  const [form, setForm] = useState<SrsSettings>(deck ? settingsForDeck(settings, deck.id) : settings);
  const [justSaved, setJustSaved] = useState(false);
  // A deck that follows the defaults shows them, read-only, until "own settings" is switched on.
  const shown = deck && !custom ? settings : form;
  const editable = !deck || custom;

  const againOk = parseStep(form.againStep) !== null;
  const hardOk = parseStep(form.hardStep) !== null;
  const relearningOk = parseSteps(form.relearningSteps) !== null;
  const valid = !editable || (againOk && hardOk && relearningOk);
  const set = (patch: Partial<SrsSettings>) => {
    setForm({ ...form, ...patch });
    setJustSaved(false);
  };
  const number = (key: keyof typeof SETTINGS_LIMITS, value: string) => set({ [key]: value === "" ? NaN : Number(value) });

  async function save() {
    if (!deck) {
      await updateSrsSettings(form);
    } else {
      const overrides = { ...settings.deckOverrides };
      const changes = custom ? deckOptionChanges(form as DeckOptions, settings) : {};
      if (Object.keys(changes).length) overrides[deck.id] = changes;
      else delete overrides[deck.id];
      await updateSrsSettings({ deckOverrides: overrides });
    }
    setJustSaved(true);
  }

  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void save();
      }}
    >
      {deck ? (
        <label className="check-field">
          <input
            type="checkbox"
            checked={custom}
            onChange={(e) => {
              setCustom(e.target.checked);
              setJustSaved(false);
            }}
          />
          <span>
            <strong>{t.deckCustom}</strong>
            <span className="hint">{t.deckCustomHint}</span>
          </span>
        </label>
      ) : (
        <label className="check-field">
          <input type="checkbox" checked={form.enableForNewDecks} onChange={(e) => set({ enableForNewDecks: e.target.checked })} />
          <span>
            <strong>{t.enableForNewDecks}</strong>
            <span className="hint">{t.enableForNewDecksHint}</span>
          </span>
        </label>
      )}

      <fieldset className="plain-fieldset" disabled={!editable}>
        <div className="field-row">
          <NumberField id="new-per-day" label={t.newPerDay} value={shown.newPerDay} limits={SETTINGS_LIMITS.newPerDay} onChange={(v) => number("newPerDay", v)} />
          <NumberField id="reviews-per-day" label={t.reviewsPerDay} value={shown.reviewsPerDay} limits={SETTINGS_LIMITS.reviewsPerDay} onChange={(v) => number("reviewsPerDay", v)} />
        </div>
        <span className="hint">{t.limitsHint}</span>

        <NumberField
          id="retention"
          label={t.desiredRetention}
          hint={t.desiredRetentionHint}
          value={shown.desiredRetention}
          limits={SETTINGS_LIMITS.desiredRetention}
          step={0.01}
          onChange={(v) => number("desiredRetention", v)}
        />

        <div className="field-row">
          <TextField id="again-step" label={t.againStep} value={shown.againStep} ok={!editable || againOk} hint={t.againStepHint} error={t.invalidStep} onChange={(v) => set({ againStep: v })} />
          <TextField id="hard-step" label={t.hardStep} value={shown.hardStep} ok={!editable || hardOk} hint={t.hardStepHint} error={t.invalidStep} onChange={(v) => set({ hardStep: v })} />
        </div>

        <TextField
          id="relearning-steps"
          label={t.relearningSteps}
          value={shown.relearningSteps}
          ok={!editable || relearningOk}
          hint={t.relearningStepsHint}
          error={t.invalidSteps}
          onChange={(v) => set({ relearningSteps: v })}
        />

        <NumberField id="max-interval" label={t.maximumInterval} value={shown.maximumInterval} limits={SETTINGS_LIMITS.maximumInterval} onChange={(v) => number("maximumInterval", v)} />
      </fieldset>

      <div className="controls left">
        <button type="submit" className="btn accent" disabled={!valid}>
          {t.save}
        </button>
        {editable && (
          <button
            type="button"
            className="link-button"
            onClick={() => set(deckOptionsOf(deck ? settings : DEFAULT_SETTINGS))}
          >
            {t.resetDefaults}
          </button>
        )}
        {justSaved && <span className="saved-note">{deck ? fill(t.deckSaved, { deck: deck.title }) : t.saved}</span>}
      </div>
    </form>
  );
}

function Optimizer({ settings, signedIn, t }: { settings: SrsSettings; signedIn: boolean; t: T }) {
  const { lang } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "error" | "notEnough" | "done">("idle");
  const [count, setCount] = useState<number | null>(null);

  async function run() {
    setState("busy");
    const result = await optimizeParameters(settings);
    if (result.status === "ok") setState("done");
    else if (result.status === "not_enough") {
      setCount(result.reviewCount);
      setState("notEnough");
    } else setState("error");
  }

  return (
    <section className="settings-form optimizer">
      <h2>{t.optimizerTitle}</h2>
      <p className="muted">{t.optimizerLead}</p>
      <p>
        {settings.parameters && settings.optimizedAt
          ? fill(t.optimizerDone, {
              n: settings.optimizedReviewCount,
              date: new Date(settings.optimizedAt).toLocaleDateString(lang === "sv" ? "sv-SE" : "en-GB"),
            })
          : t.optimizerStandard}
      </p>
      {signedIn ? (
        <>
          <div className="controls left">
            <button type="button" className="btn accent" disabled={state === "busy"} onClick={() => void run()}>
              {state === "busy" ? t.optimizing : t.optimizeNow}
            </button>
            {settings.parameters && (
              <button type="button" className="link-button" onClick={() => void updateSrsSettings({ parameters: null, optimizedAt: null, optimizedReviewCount: 0 })}>
                {t.resetParameters}
              </button>
            )}
            {state === "done" && <span className="saved-note">{t.saved}</span>}
          </div>
          {state === "notEnough" && (
            <p className="hint">
              {count !== null && count < MIN_REVIEWS_TO_OPTIMIZE ? fill(t.optimizeNeedMore, { min: MIN_REVIEWS_TO_OPTIMIZE, n: count }) : t.optimizeNoChange}
            </p>
          )}
          {state === "error" && <p className="hint error">{t.optimizeError}</p>}
          {state !== "notEnough" && <ReviewCountHint t={t} />}
          <label className="check-field">
            <input type="checkbox" checked={settings.autoOptimize} onChange={(e) => void updateSrsSettings({ autoOptimize: e.target.checked })} />
            <span>
              <strong>{t.autoOptimize}</strong>
              <span className="hint">{fill(t.autoOptimizeHint, { n: AUTO_OPTIMIZE_EVERY })}</span>
            </span>
          </label>
        </>
      ) : (
        <p className="hint">{t.optimizeSignIn}</p>
      )}
    </section>
  );
}

/** Shows how many reviews are still missing before optimising is worthwhile. */
function ReviewCountHint({ t }: { t: T }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    void countReviews().then((n) => live && setCount(n));
    return () => {
      live = false;
    };
  }, []);
  if (count === null || count >= MIN_REVIEWS_TO_OPTIMIZE) return null;
  return <p className="hint">{fill(t.optimizeNeedMore, { min: MIN_REVIEWS_TO_OPTIMIZE, n: count })}</p>;
}

function TextField(props: { id: string; label: string; value: string; ok: boolean; hint: string; error: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={props.id}>{props.label}</label>
      <input id={props.id} type="text" value={props.value} aria-invalid={!props.ok} onChange={(e) => props.onChange(e.target.value)} />
      <span className={`hint${props.ok ? "" : " error"}`}>{props.ok ? props.hint : props.error}</span>
    </div>
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
