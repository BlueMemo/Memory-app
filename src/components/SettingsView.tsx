"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { setPreferences, usePreferences, type Preferences } from "@/lib/preferences";

/** /settings: general, per-device preferences (appearance and library layout). Spaced repetition lives in the Library. */
export function SettingsView() {
  const t = useI18n().t.settings;
  const prefs = usePreferences();
  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <section className="settings-form">
        <h2>{t.appearanceTitle}</h2>
        <Choice
          label={t.theme}
          name="theme"
          value={prefs.theme}
          options={[
            ["dark", t.themeDark],
            ["light", t.themeLight],
            ["system", t.themeSystem],
          ]}
        />
        <Choice
          label={t.textSize}
          name="textSize"
          value={prefs.textSize}
          options={[
            ["normal", t.textNormal],
            ["large", t.textLarge],
            ["larger", t.textLarger],
          ]}
        />
        <label className="check-field">
          <input type="checkbox" checked={prefs.reduceMotion} onChange={(e) => setPreferences({ reduceMotion: e.target.checked })} />
          <span>
            <strong>{t.reduceMotion}</strong>
            <span className="hint">{t.reduceMotionHint}</span>
          </span>
        </label>
      </section>

      <section className="settings-form">
        <h2>{t.libraryTitle}</h2>
        <Choice
          label={t.libraryView}
          name="libraryView"
          value={prefs.libraryView}
          options={[
            ["grid", t.viewGrid],
            ["list", t.viewList],
          ]}
        />
        <Choice
          label={t.librarySort}
          name="librarySort"
          value={prefs.librarySort}
          options={[
            ["recent", t.sortRecent],
            ["practised", t.sortPractised],
            ["due", t.sortDue],
            ["name", t.sortName],
          ]}
        />
        <Choice
          label={t.libraryGroup}
          name="libraryGroup"
          value={prefs.libraryGroup}
          options={[
            ["split", t.groupSplit],
            ["all", t.groupAll],
            ["kind", t.groupKind],
          ]}
          stacked
        />
      </section>

      <p className="fine-print">{t.storedDevice}</p>
      <p>
        <Link href="/library/settings" className="tile-open">
          {t.srsLink}
        </Link>
      </p>
    </main>
  );
}

type ChoiceKey = "theme" | "textSize" | "libraryView" | "librarySort" | "libraryGroup";

/** A row of radio buttons styled as a segmented control; `stacked` lists long options vertically. */
export function Choice<K extends ChoiceKey>(props: {
  label: string;
  name: K;
  value: Preferences[K];
  options: [Preferences[K], string][];
  stacked?: boolean;
}) {
  return (
    <fieldset className="field choice">
      <legend>{props.label}</legend>
      <div className={`segmented${props.stacked ? " stacked" : ""}`}>
        {props.options.map(([value, text]) => (
          <label key={value} className={value === props.value ? "active" : undefined}>
            <input
              type="radio"
              name={props.name}
              value={value}
              checked={value === props.value}
              onChange={() => setPreferences({ [props.name]: value } as Partial<Preferences>)}
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
