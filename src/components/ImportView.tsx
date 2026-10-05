"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { dictionaries, languages, useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import {
  BLOCKING,
  defaultRoles,
  draftToCard,
  findProblems,
  MAX_CARDS,
  parseImport,
  rowToDraft,
  SEPARATORS,
  suggestKind,
  type Kind,
  type Problem,
  type Role,
  type Separator,
} from "@/lib/import/parse";
import { fill } from "@/lib/practice";
import { setDeckSrsEnabled, useSrsData, useSrsSignedIn } from "@/lib/srs/store";
import type { Deck, Lang } from "@/lib/types";
import { addUserDeck } from "@/lib/userDecks";

type T = Dict["import"];

const MAX_FILE_MB = 5;
const PAGE = 100;
/** Above this, a guest's browser storage (about 5 MB, shared with everything else) may not hold the deck. */
const GUEST_SIZE_WARNING = 2_000_000;
const ROLES: Role[] = ["prompt", "answer", "visualization", "note", "ignore"];

/** Choices that only make sense for one particular parse; they reset when the text or parse settings change. */
interface Adjustments {
  key: string;
  roles?: Role[];
  edits: Record<number, string[]>;
  skipped: Record<number, boolean>;
}

export function ImportView() {
  const { lang: siteLang, t: dict } = useI18n();
  const t = dict.import;
  const router = useRouter();
  const srs = useSrsData();
  const signedIn = useSrsSignedIn();

  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [separator, setSeparator] = useState<Separator | "auto">("auto");
  const [headerRow, setHeaderRow] = useState<boolean | "auto">("auto");
  const [kindChoice, setKindChoice] = useState<Kind | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderLabel, setOrderLabel] = useState("");
  const [language, setLanguage] = useState<Lang>(siteLang);
  const [srsChoice, setSrsChoice] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseImport(text, { separator, headerRow }) : null), [text, separator, headerRow]);
  const detected = useMemo(() => (text.trim() ? parseImport(text, { separator: "auto", headerRow }).separator : null), [text, headerRow]);

  const parseKey = `${separator}|${headerRow}|${text}`;
  const [adjust, setAdjust] = useState<Adjustments>({ key: "", edits: {}, skipped: {} });
  const current: Adjustments = adjust.key === parseKey ? adjust : { key: parseKey, edits: {}, skipped: {} };
  const update = (patch: Partial<Adjustments>) => setAdjust({ ...current, ...patch });

  const roles = current.roles ?? (parsed ? defaultRoles(parsed) : []);
  const kind = kindChoice ?? suggestKind(roles);
  const effectiveRoles = kind === "ordered" ? roles.map((r) => (r === "prompt" ? "ignore" : r)) : roles;

  const rows = parsed ? parsed.rows.map((r, i) => current.edits[i] ?? r) : [];
  const drafts = rows.map((r) => rowToDraft(r, effectiveRoles));
  const problems = findProblems(drafts, kind);
  const blocked = (i: number) => problems[i].some((p) => BLOCKING.includes(p));
  const included = rows.map((_, i) => !current.skipped[i] && !blocked(i));
  const readyIndexes = included.flatMap((ok, i) => (ok ? [i] : [])).slice(0, MAX_CARDS);
  const toCheck = rows.filter((_, i) => problems[i].length > 0).length;
  const srsOn = srsChoice ?? srs.settings.enableForNewDecks;

  const loadFile = async (file: File) => {
    setFileError(null);
    if (/\.(apkg|colpkg)$/i.test(file.name)) return setFileError(t.apkgNotYet);
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setFileError(fill(t.fileTooBig, { mb: MAX_FILE_MB }));
    try {
      setText(await file.text());
      setFileName(file.name);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    } catch {
      setFileError(t.readError);
    }
  };

  const create = async () => {
    const cards = readyIndexes.map((i) => draftToCard(drafts[i], kind, crypto.randomUUID()));
    const deck: Deck = {
      id: `user-${crypto.randomUUID()}`,
      title: title.trim(),
      description: description.trim() || fill(t.defaultDescription, { n: cards.length }),
      language,
      kind,
      instructions:
        kind === "ordered"
          ? [dict.creator.defaultInstructionsOrdered1, dict.creator.defaultInstructionsOrdered2]
          : [dict.creator.defaultInstructionsUnordered1, dict.creator.defaultInstructionsUnordered2],
      cards,
    };
    if (kind === "ordered" && orderLabel.trim()) deck.orderLabel = orderLabel.trim();
    setCreating(true);
    await addUserDeck(deck);
    await setDeckSrsEnabled(deck.id, srsOn);
    router.push(`/decks/${deck.id}`);
  };

  const visibleRows = rows.map((_, i) => i).filter((i) => !onlyProblems || problems[i].length > 0);
  const roleError = kind === "unordered" && !roles.includes("prompt") ? t.needPrompt : !roles.includes("answer") ? t.needAnswer : null;
  const bigForGuest = !signedIn && readyIndexes.length > 0 && JSON.stringify(readyIndexes.map((i) => drafts[i])).length > GUEST_SIZE_WARNING;

  return (
    <main className="page wide import-page">
      <Link href="/library" className="link-muted">
        {dict.deck.backToLibrary}
      </Link>
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <h2 className="step-title">{t.stepSource}</h2>
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) loadFile(file);
        }}
      >
        <textarea
          className="import-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName(null);
          }}
          placeholder={t.pastePlaceholder}
          aria-label={t.pasteLabel}
          spellCheck={false}
        />
        <div className="file-row">
          <label className="btn nav file-btn">
            {t.chooseFile}
            <input
              type="file"
              accept=".txt,.csv,.tsv,.apkg,text/plain,text/csv,text/tab-separated-values"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) loadFile(file);
              }}
            />
          </label>
          <span className="muted">{fileName ? fill(t.fileLoaded, { name: fileName }) : t.dropHint}</span>
        </div>
        {fileError && <p className="notice error">{fileError}</p>}
        <p className="hint">{t.exportTip}</p>
      </div>

      {parsed && (
        <>
          <h2 className="step-title">{t.stepColumns}</h2>
          <div className="import-options">
            <div className="field">
              <label htmlFor="import-separator">{t.separatorLabel}</label>
              <select id="import-separator" value={separator} onChange={(e) => setSeparator(e.target.value as Separator | "auto")}>
                <option value="auto">{fill(t.sepAuto, { detected: t.sep[detected ?? "none"] })}</option>
                {[...SEPARATORS, "none" as const].map((s) => (
                  <option key={s} value={s}>
                    {t.sep[s]}
                  </option>
                ))}
              </select>
            </div>
            <label className="check-field inline">
              <input type="checkbox" checked={parsed.usedHeaderRow} onChange={(e) => setHeaderRow(e.target.checked)} />
              <span>{t.headerRowLabel}</span>
            </label>
          </div>

          <div className="field">
            <label>{t.kindLabel}</label>
            <div className="kind-options">
              {(["ordered", "unordered"] as const).map((k) => (
                <button key={k} type="button" className={`kind-option${kind === k ? " selected" : ""}`} onClick={() => setKindChoice(k)}>
                  <strong>{k === "ordered" ? t.kindRoute : t.kindAssoc}</strong>
                  <span>{k === "ordered" ? t.kindRouteHint : t.kindAssocHint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="import-summary">
            <strong>{fill(t.summary, { ready: readyIndexes.length })}</strong>
            {rows.length - readyIndexes.length > 0 && <span className="muted">{fill(t.skippedCount, { n: rows.length - readyIndexes.length })}</span>}
            {toCheck > 0 && (
              <label className="check-field inline">
                <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
                <span>{fill(t.onlyProblems, { n: toCheck })}</span>
              </label>
            )}
          </div>
          {roleError && <p className="notice error">{roleError}</p>}
          {kind === "ordered" && roles.includes("prompt") && <p className="hint">{t.promptIgnoredForRoute}</p>}
          {readyIndexes.length < included.filter(Boolean).length && <p className="notice">{fill(t.tooMany, { max: MAX_CARDS })}</p>}

          <div className="table-wrap import-table-wrap">
            <table className="browser-table import-table">
              <thead>
                <tr>
                  <th className="col-check" />
                  <th className="col-num">#</th>
                  {roles.map((role, c) => (
                    <th key={c}>
                      <select
                        className="role-select"
                        value={role}
                        aria-label={fill(t.columnLabel, { n: c + 1 })}
                        onChange={(e) => update({ roles: roles.map((r, k) => (k === c ? (e.target.value as Role) : r)) })}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t.role[r]}
                          </option>
                        ))}
                      </select>
                      <span className="col-name">{parsed.header?.[c] || fill(t.columnLabel, { n: c + 1 })}</span>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, shown).map((i) => (
                  <ImportRow
                    key={i}
                    index={i}
                    row={rows[i]}
                    columns={roles.length}
                    roles={effectiveRoles}
                    problems={problems[i]}
                    included={included[i]}
                    blocked={blocked(i)}
                    editing={editing === i}
                    t={t}
                    onToggle={() => update({ skipped: { ...current.skipped, [i]: !current.skipped[i] } })}
                    onEdit={() => setEditing(editing === i ? null : i)}
                    onChange={(cells) => update({ edits: { ...current.edits, [i]: cells } })}
                  />
                ))}
              </tbody>
            </table>
            {visibleRows.length > shown && (
              <button className="link-button show-more" onClick={() => setShown(shown + PAGE)}>
                {fill(t.showMore, { n: Math.min(PAGE, visibleRows.length - shown) })}
              </button>
            )}
          </div>

          <h2 className="step-title">{t.stepDetails}</h2>
          <div className="field">
            <label htmlFor="import-title">{dict.creator.titleLabel}</label>
            <input id="import-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={dict.creator.titlePlaceholder} />
          </div>
          <div className="field">
            <label htmlFor="import-description">{t.descriptionLabel}</label>
            <textarea id="import-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {kind === "ordered" && (
            <div className="field">
              <label htmlFor="import-order">{dict.creator.orderLabelLabel}</label>
              <input id="import-order" type="text" value={orderLabel} onChange={(e) => setOrderLabel(e.target.value)} placeholder={dict.creator.orderLabelPlaceholder} />
            </div>
          )}
          <div className="field">
            <label htmlFor="import-language">{dict.creator.languageLabel}</label>
            <select id="import-language" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {dictionaries[l].languageName}
                </option>
              ))}
            </select>
          </div>
          <label className="check-field">
            <input type="checkbox" checked={srsOn} onChange={(e) => setSrsChoice(e.target.checked)} />
            <span>
              <strong>{dict.creator.useSrsLabel}</strong>
              <span className="hint">{dict.creator.useSrsText}</span>
            </span>
          </label>
          {bigForGuest && <p className="notice">{t.guestSizeWarning}</p>}

          <div className="controls left">
            <button className="btn accent" disabled={creating || readyIndexes.length === 0 || !title.trim() || !!roleError} onClick={create}>
              {creating ? t.creating : fill(t.create, { n: readyIndexes.length })}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function ImportRow(props: {
  index: number;
  row: string[];
  columns: number;
  roles: Role[];
  problems: Problem[];
  included: boolean;
  blocked: boolean;
  editing: boolean;
  t: T;
  onToggle: () => void;
  onEdit: () => void;
  onChange: (cells: string[]) => void;
}) {
  const { index, row, columns, roles, problems, included, blocked, editing, t } = props;
  const cells = Array.from({ length: columns }, (_, c) => row[c] ?? "");
  return (
    <tr className={included ? undefined : "excluded"}>
      <td className="col-check">
        <input type="checkbox" checked={included} disabled={blocked} onChange={props.onToggle} aria-label={t.include} />
      </td>
      <td className="col-num muted">{index + 1}</td>
      {cells.map((cell, c) => (
        <td key={c} className={roles[c] === "ignore" ? "ignored" : undefined}>
          {editing ? (
            <input
              type="text"
              className="cell-input"
              value={cell}
              onChange={(e) => props.onChange(cells.map((v, k) => (k === c ? e.target.value : v)))}
            />
          ) : (
            cell
          )}
        </td>
      ))}
      <td className="row-end">
        {problems.map((p) => (
          <span key={p} className={`problem${BLOCKING.includes(p) ? " blocking" : ""}`}>
            {t.problem[p]}
          </span>
        ))}
        <button type="button" className="icon-btn" title={editing ? t.done : t.edit} onClick={props.onEdit}>
          {editing ? "✓" : "✎"}
        </button>
      </td>
    </tr>
  );
}
