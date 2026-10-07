"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { resolveDeck, useDeckOverrides } from "@/lib/deckOverrides";
import { isSharedDeck, saveEditedDeck, useSavedDecks } from "@/lib/editableDecks";
import { downloadDeck } from "@/lib/exportDeck";
import { toggleSavedDeck } from "@/lib/library";
import { fill } from "@/lib/practice";
import {
  DEFAULT_PRESET_ID,
  PRESET_OPTION_KEYS,
  parseStep,
  parseSteps,
  presetForDeck,
  SETTINGS_LIMITS,
  type DeckSettings,
  type Preset,
  type PresetOptions,
  type SrsSettings,
} from "@/lib/srs/core";
import { AUTO_OPTIMIZE_EVERY, countReviews, MIN_REVIEWS_TO_OPTIMIZE, optimizeParameters } from "@/lib/srs/optimize";
import { updateSrsSettings, useSrsData, useSrsSignedIn, useSrsStatus } from "@/lib/srs/store";
import type { Deck } from "@/lib/types";
import { answerModeSummary, type AnswerMode } from "@/lib/typedAnswer";
import { useUserDecks } from "@/lib/userDecks";
import { DeleteDeckButton } from "./DeleteDeckButton";
import { PageTabs } from "./PageTabs";
import { SharePanel } from "./SharePanel";

type T = ReturnType<typeof useI18n>["t"]["srsSettings"];

/** A preset's display name: the default one is called "Standard"/"Default" in the site's language. */
export const presetName = (p: Preset, t: T) => (p.id === DEFAULT_PRESET_ID ? t.defaultPreset : p.name || t.unnamedPreset);

/**
 * /library/settings. Without `?deck=` it's where presets and the personal FSRS model are managed; with
 * `?deck=<id>` it's that deck's settings: the everyday ones (new cards a day, exam date, share, export,
 * edit, delete) up front, and "Advanced" (its preset and the preset's FSRS options) behind a button.
 */
export function SrsSettingsView({ deckId }: { deckId: string | null }) {
  const t = useI18n().t.srsSettings;
  const router = useRouter();
  const { settings } = useSrsData();
  const status = useSrsStatus();
  const signedIn = useSrsSignedIn();
  const decks = useLibraryDecks();
  const deck = deckId ? decks.find((d) => d.id === deckId) ?? null : null;

  return (
    <main className="page narrow">
      <Link href={deck ? `/decks/${deck.id}` : "/library"} className="link-muted">
        {deck ? `← ${deck.title}` : t.backToLibrary}
      </Link>
      <section className="page-intro">
        <h1>{deck ? t.deckTitle : t.title}</h1>
        <p>{deck ? t.deckLead : t.lead}</p>
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

      {status !== "loading" &&
        (deck ? (
          <DeckSettingsForm key={`${signedIn ? "account" : "browser"}:${deck.id}`} deck={deck} settings={settings} t={t} />
        ) : (
          <>
            <PageTabs
              label={t.title}
              tabs={[
                { id: "defaults", title: t.defaultsSection },
                { id: "presets", title: t.presetsTitle },
                { id: "optimizer", title: t.optimizerTitle },
              ]}
            />
            <DefaultsForm key={signedIn ? "account" : "browser"} settings={settings} t={t} />
            <PresetManager settings={settings} t={t} />
            <Optimizer settings={settings} signedIn={signedIn} t={t} />
          </>
        ))}
      {!signedIn && <p className="fine-print">{t.storedLocal}</p>}
    </main>
  );
}

/** Every deck in the learner's library (own and saved), plus official decks they use without saving. */
function useLibraryDecks(): Deck[] {
  const userDecks = useUserDecks();
  const savedDecks = useSavedDecks();
  const overrides = useDeckOverrides();
  const { enabled, settings } = useSrsData();
  const all = new Map<string, Deck>();
  for (const d of [...userDecks, ...savedDecks]) all.set(d.id, d);
  for (const d of officialDecks.map((o) => resolveDeck(o, overrides))) {
    if (!all.has(d.id) && (enabled[d.id] === true || settings.deckOverrides[d.id] !== undefined)) all.set(d.id, d);
  }
  return [...all.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** One deck's settings. Saving writes only what differs from the defaults. */
function DeckSettingsForm({ deck, settings, t }: { deck: Deck; settings: SrsSettings; t: T }) {
  const router = useRouter();
  const savedIds = useSavedDecks().map((d) => d.id);
  const own = settings.deckOverrides[deck.id] ?? {};
  const [newPerDay, setNewPerDay] = useState(own.newPerDay ?? settings.newPerDay);
  const [examDate, setExamDate] = useState(own.examDate ?? "");
  const [presetId, setPresetId] = useState(presetForDeck(settings, deck.id).id);
  const [advanced, setAdvanced] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const mine = !isSharedDeck(deck.id);

  async function save() {
    const next: Partial<DeckSettings> = {};
    if (Number.isFinite(newPerDay) && newPerDay !== settings.newPerDay) {
      next.newPerDay = Math.round(Math.min(SETTINGS_LIMITS.newPerDay.max, Math.max(SETTINGS_LIMITS.newPerDay.min, newPerDay)));
    }
    if (examDate) next.examDate = examDate;
    if (presetId !== DEFAULT_PRESET_ID) next.presetId = presetId;
    const overrides = { ...settings.deckOverrides };
    if (Object.keys(next).length) overrides[deck.id] = next;
    else delete overrides[deck.id];
    await updateSrsSettings({ deckOverrides: overrides });
    setJustSaved(true);
  }

  // What travels with a published copy: the deck's preset options and its new cards a day.
  const preset = settings.presets.find((p) => p.id === presetId) ?? settings.presets[0];
  const shareable = { ...Object.fromEntries(PRESET_OPTION_KEYS.map((k) => [k, preset[k]])), newPerDay };

  return (
    <>
      <PageTabs
        label={t.deckTitle}
        tabs={[
          { id: "study", title: t.studySection },
          { id: "share", title: t.shareSection },
          { id: "export", title: t.exportSection },
          { id: "manage", title: t.manageSection },
          { id: "advanced", title: t.advancedTitle },
        ]}
      />

      <form
        className="settings-form"
        id="study"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        onChange={() => setJustSaved(false)}
      >
        <h2>{t.studySection}</h2>
        <NumberField id="new-per-day" label={t.newPerDay} hint={t.newPerDayHint} value={newPerDay} limits={SETTINGS_LIMITS.newPerDay} onChange={(v) => setNewPerDay(v === "" ? NaN : Number(v))} />
        <div className="field">
          <label htmlFor="exam-date">{t.examDate}</label>
          <input id="exam-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <span className="hint">{t.examDateHint}</span>
        </div>

        <button type="button" className="advanced-toggle" id="advanced" aria-expanded={advanced} onClick={() => setAdvanced((a) => !a)}>
          {advanced ? "▾" : "▸"} {t.advancedTitle}
        </button>
        {advanced && (
          <div className="advanced-panel">
            <p className="muted">{t.advancedLead}</p>
            <div className="field">
              <label htmlFor="deck-preset">{t.presetLabel}</label>
              <select id="deck-preset" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                {settings.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {presetName(p, t)}
                  </option>
                ))}
              </select>
              <span className="hint">{t.presetHint}</span>
            </div>
            <p>
              <Link href="/library/settings#presets" className="tile-open">
                {t.editPresets}
              </Link>
            </p>
          </div>
        )}

        <div className="controls left">
          <button type="submit" className="btn accent">
            {t.save}
          </button>
          {justSaved && <span className="saved-note">{fill(t.deckSaved, { deck: deck.title })}</span>}
        </div>
      </form>

      <AnswerStyleSection deck={deck} />

      <section className="settings-form" id="share">
        <h2>{t.shareSection}</h2>
        {mine ? <SharePanel deck={deck} settings={shareable} /> : <p className="muted">{t.shareOnlyOwn}</p>}
      </section>

      <section className="settings-form" id="export">
        <h2>{t.exportSection}</h2>
        <p className="muted">{t.exportLead}</p>
        <div className="controls left">
          <button type="button" className="btn nav" onClick={() => downloadDeck(deck, "txt")}>
            {t.exportTxt}
          </button>
          <button type="button" className="btn nav" onClick={() => downloadDeck(deck, "csv")}>
            {t.exportCsv}
          </button>
        </div>
      </section>

      <section className="settings-form danger-zone" id="manage">
        <h2>{t.manageSection}</h2>
        <div className="controls left">
          <Link href={`/library/edit/${deck.id}`} className="btn nav">
            {t.editDeck}
          </Link>
          {mine ? (
            <DeleteDeckButton deckId={deck.id} onDeleted={() => router.push("/library")} />
          ) : (
            savedIds.includes(deck.id) && (
              <button
                type="button"
                className="btn danger"
                onClick={async () => {
                  await toggleSavedDeck(deck.id);
                  router.push("/library");
                }}
              >
                {t.removeFromLibrary}
              </button>
            )
          )}
        </div>
        {mine && <p className="hint">{t.deleteText}</p>}
      </section>
    </>
  );
}

/** Defaults for all decks: new cards a day, and whether new decks use spaced repetition. */
function DefaultsForm({ settings, t }: { settings: SrsSettings; t: T }) {
  const [newPerDay, setNewPerDay] = useState(settings.newPerDay);
  const [enableForNewDecks, setEnable] = useState(settings.enableForNewDecks);
  const [justSaved, setJustSaved] = useState(false);
  return (
    <form
      className="settings-form"
      id="defaults"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!Number.isFinite(newPerDay)) return;
        await updateSrsSettings({ newPerDay, enableForNewDecks });
        setJustSaved(true);
      }}
      onChange={() => setJustSaved(false)}
    >
      <h2>{t.defaultsSection}</h2>
      <NumberField id="default-new" label={t.newPerDay} hint={t.defaultNewPerDayHint} value={newPerDay} limits={SETTINGS_LIMITS.newPerDay} onChange={(v) => setNewPerDay(v === "" ? NaN : Number(v))} />
      <label className="check-field">
        <input type="checkbox" checked={enableForNewDecks} onChange={(e) => setEnable(e.target.checked)} />
        <span>
          <strong>{t.enableForNewDecks}</strong>
          <span className="hint">{t.enableForNewDecksHint}</span>
        </span>
      </label>
      <div className="controls left">
        <button type="submit" className="btn accent">
          {t.save}
        </button>
        {justSaved && <span className="saved-note">{t.saved}</span>}
      </div>
    </form>
  );
}

/**
 * Named presets: pick one to edit its FSRS options (they apply to every deck using it), create a new one
 * from the current, rename, or remove it (its decks go back to the default preset).
 */
function PresetManager({ settings, t }: { settings: SrsSettings; t: T }) {
  const [selectedId, setSelectedId] = useState(settings.presets[0].id);
  const preset = settings.presets.find((p) => p.id === selectedId) ?? settings.presets[0];
  const usedBy = Object.values(settings.deckOverrides).filter((o) => (o.presetId ?? DEFAULT_PRESET_ID) === preset.id).length;

  async function create() {
    const name = window.prompt(t.newPresetPrompt)?.trim();
    if (!name) return;
    const id = `preset-${crypto.randomUUID().slice(0, 8)}`;
    await updateSrsSettings({ presets: [...settings.presets, { ...preset, id, name: name.slice(0, 60) }] });
    setSelectedId(id);
  }
  async function rename() {
    const name = window.prompt(t.renamePresetPrompt, preset.name)?.trim();
    if (!name) return;
    await updateSrsSettings({ presets: settings.presets.map((p) => (p.id === preset.id ? { ...p, name: name.slice(0, 60) } : p)) });
  }
  async function remove() {
    if (!window.confirm(fill(t.removePresetConfirm, { name: presetName(preset, t) }))) return;
    const deckOverrides = Object.fromEntries(
      Object.entries(settings.deckOverrides).map(([id, o]) => [id, o.presetId === preset.id ? { ...o, presetId: undefined } : o]),
    );
    await updateSrsSettings({ presets: settings.presets.filter((p) => p.id !== preset.id), deckOverrides });
    setSelectedId(DEFAULT_PRESET_ID);
  }

  return (
    <section className="settings-form" id="presets">
      <h2>{t.presetsTitle}</h2>
      <p className="muted">{t.presetsLead}</p>
      <div className="preset-bar">
        <select value={preset.id} onChange={(e) => setSelectedId(e.target.value)} aria-label={t.presetLabel}>
          {settings.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {presetName(p, t)}
            </option>
          ))}
        </select>
        <button type="button" className="link-button" onClick={() => void create()}>
          {t.newPreset}
        </button>
        {preset.id !== DEFAULT_PRESET_ID && (
          <>
            <button type="button" className="link-button" onClick={() => void rename()}>
              {t.renamePreset}
            </button>
            <button type="button" className="link-button" onClick={() => void remove()}>
              {t.removePreset}
            </button>
          </>
        )}
      </div>
      <p className="hint">{fill(usedBy === 1 ? t.presetUsedByOne : t.presetUsedBy, { n: usedBy })}</p>
      <PresetForm key={preset.id} preset={preset} settings={settings} t={t} />
    </section>
  );
}

function PresetForm({ preset, settings, t }: { preset: Preset; settings: SrsSettings; t: T }) {
  const [form, setForm] = useState<PresetOptions>(preset);
  const [justSaved, setJustSaved] = useState(false);
  const againOk = parseStep(form.againStep) !== null;
  const hardOk = parseStep(form.hardStep) !== null;
  const relearningOk = parseSteps(form.relearningSteps) !== null;
  const valid = againOk && hardOk && relearningOk && Number.isFinite(form.desiredRetention) && Number.isFinite(form.maximumInterval);
  const set = (patch: Partial<PresetOptions>) => {
    setForm({ ...form, ...patch });
    setJustSaved(false);
  };
  const number = (key: "desiredRetention" | "maximumInterval", value: string) => set({ [key]: value === "" ? NaN : Number(value) });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        await updateSrsSettings({ presets: settings.presets.map((p) => (p.id === preset.id ? { ...p, ...form } : p)) });
        setJustSaved(true);
      }}
    >
      <NumberField
        id="retention"
        label={t.desiredRetention}
        hint={t.desiredRetentionHint}
        value={form.desiredRetention}
        limits={SETTINGS_LIMITS.desiredRetention}
        step={0.01}
        onChange={(v) => number("desiredRetention", v)}
      />
      <div className="field-row">
        <TextField id="again-step" label={t.againStep} value={form.againStep} ok={againOk} hint={t.againStepHint} error={t.invalidStep} onChange={(v) => set({ againStep: v })} />
        <TextField id="hard-step" label={t.hardStep} value={form.hardStep} ok={hardOk} hint={t.hardStepHint} error={t.invalidStep} onChange={(v) => set({ hardStep: v })} />
      </div>
      <TextField id="relearning-steps" label={t.relearningSteps} value={form.relearningSteps} ok={relearningOk} hint={t.relearningStepsHint} error={t.invalidSteps} onChange={(v) => set({ relearningSteps: v })} />
      <NumberField id="max-interval" label={t.maximumInterval} value={form.maximumInterval} limits={SETTINGS_LIMITS.maximumInterval} onChange={(v) => number("maximumInterval", v)} />
      <div className="controls left">
        <button type="submit" className="btn accent" disabled={!valid}>
          {t.save}
        </button>
        {justSaved && <span className="saved-note">{t.saved}</span>}
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
    <section className="settings-form optimizer" id="optimizer">
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

/** How this deck's cards are answered when studying: flip, or type the answer. Switches every card at once. */
function AnswerStyleSection({ deck }: { deck: Deck }) {
  const t = useI18n().t.answerStyle;
  const summary = answerModeSummary(deck.cards);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function setAll(mode: AnswerMode) {
    setBusy(true);
    setFailed(false);
    try {
      await saveEditedDeck({
        ...deck,
        cards: deck.cards.map((c) => {
          const next = { ...c };
          if (mode === "type") next.answerMode = "type";
          else delete next.answerMode;
          return next;
        }),
      });
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <section className="settings-form" id="answers">
      <h2>{t.sectionTitle}</h2>
      <p className="muted">{t.sectionLead}</p>
      <p>
        <strong>
          {summary.state === "none" ? t.summaryNone : summary.state === "all" ? t.summaryAll : fill(t.summaryMixed, { typed: summary.typed, total: summary.total })}
        </strong>
      </p>
      <div className="controls left">
        <button type="button" className="btn nav" disabled={busy || summary.state === "none"} onClick={() => void setAll("show")}>
          {t.setAllShow}
        </button>
        <button type="button" className="btn nav" disabled={busy || summary.state === "all"} onClick={() => void setAll("type")}>
          {t.setAllType}
        </button>
      </div>
      {failed && <p className="form-error" role="alert">{t.saveError}</p>}
    </section>
  );
}
