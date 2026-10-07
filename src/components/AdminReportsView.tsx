"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import {
  deleteProblemReport,
  dismissReport,
  hideDeck,
  loadModeration,
  loadProblemReports,
  MAX_HIDE_REASON_LENGTH,
  restoreDeck,
  setProblemHandled,
  useIsAdmin,
  type HiddenDeck,
  type ProblemReport,
  type Report,
} from "@/lib/moderation";
import { fill } from "@/lib/practice";
import { useUser } from "@/lib/supabase/useUser";

/** /admin/reports: moderators review reports and hide or restore published decks. Others see "not found". */
export function AdminReportsView() {
  const t = useI18n().t.moderation;
  const { user, loading } = useUser();
  const admin = useIsAdmin(user?.id ?? null);
  const [data, setData] = useState<{ reports: Report[]; hidden: HiddenDeck[] } | null | "error">(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!admin) return;
    let live = true;
    void loadModeration().then((result) => live && setData(result ?? "error"));
    return () => {
      live = false;
    };
  }, [admin, version]);

  if (loading) return <main className="page narrow" />;
  if (!admin) {
    return (
      <main className="page narrow">
        <p className="empty-state">{t.adminNotFound}</p>
      </main>
    );
  }

  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{t.adminTitle}</h1>
        <p>{t.adminLead}</p>
      </section>
      {data === null && <p className="muted">…</p>}
      {data === "error" && <p className="form-error" role="alert">{t.adminLoadError}</p>}
      {data && data !== "error" && (
        <>
          <h2 className="section-title">{fill(t.openReports, { n: data.reports.length })}</h2>
          {data.reports.length === 0 ? (
            <p className="muted">{t.noReports}</p>
          ) : (
            <ul className="report-list">
              {data.reports.map((report) => (
                <ReportCard key={report.id} report={report} onDone={refresh} />
              ))}
            </ul>
          )}
          <ProblemsSection />
          <h2 className="section-title">{t.hiddenTitle}</h2>
          {data.hidden.length === 0 ? (
            <p className="muted">{t.noHidden}</p>
          ) : (
            <ul className="report-list">
              {data.hidden.map((deck) => (
                <HiddenCard key={`${deck.authorId}/${deck.sourceDeckId}`} deck={deck} onDone={refresh} />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function ReportCard({ report, onDone }: { report: Report; onDone: () => void }) {
  const t = useI18n().t.moderation;
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    setFailed(false);
    const ok = await action();
    setBusy(false);
    if (ok) onDone();
    else setFailed(true);
  }

  return (
    <li className="report-card">
      <p>
        {report.publishedId ? (
          <Link href={`/shared/${report.publishedId}`}>
            <strong>{report.deckTitle || t.untitled}</strong>
          </Link>
        ) : (
          <strong>{report.deckTitle || t.untitled}</strong>
        )}{" "}
        <span className="muted">· {fill(t.byAuthor, { author: report.author ?? t.unknownUser })}</span>
      </p>
      <p>
        <span className="tag">{t.reasons[report.reason]}</span>{" "}
        <span className="muted">
          {fill(t.reportedBy, { reporter: report.reporter ?? t.unknownUser })} · {new Date(report.createdAt).toLocaleDateString()}
        </span>
      </p>
      {report.note && <blockquote className="report-quote">{report.note}</blockquote>}
      {hiding ? (
        <div className="detail-form">
          <div className="field">
            <label htmlFor={`hide-${report.id}`}>{t.hideReasonLabel}</label>
            <textarea
              id={`hide-${report.id}`}
              rows={2}
              maxLength={MAX_HIDE_REASON_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.hideReasonPlaceholder}
            />
          </div>
          <div className="controls left">
            <button type="button" className="btn danger small" disabled={busy || !reason.trim()} onClick={() => void run(() => hideDeck(report, reason))}>
              {t.hideConfirm}
            </button>
            <button type="button" className="btn nav small" disabled={busy} onClick={() => setHiding(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="controls left">
          <button type="button" className="btn danger small" disabled={busy || !report.publishedId} onClick={() => setHiding(true)}>
            {t.hideDeck}
          </button>
          <button type="button" className="btn nav small" disabled={busy} onClick={() => void run(() => dismissReport(report.id))}>
            {t.dismiss}
          </button>
        </div>
      )}
      {failed && <p className="form-error" role="alert">{t.actionError}</p>}
    </li>
  );
}

function HiddenCard({ deck, onDone }: { deck: HiddenDeck; onDone: () => void }) {
  const t = useI18n().t.moderation;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function restore() {
    setBusy(true);
    setFailed(false);
    const ok = await restoreDeck(deck);
    setBusy(false);
    if (ok) onDone();
    else setFailed(true);
  }

  return (
    <li className="report-card">
      <p>
        <Link href={`/shared/${deck.id}`}>
          <strong>{deck.title}</strong>
        </Link>{" "}
        <span className="muted">· {fill(t.byAuthor, { author: deck.author ?? t.unknownUser })}</span>
      </p>
      {deck.reason && <p className="muted">{fill(t.hiddenBecause, { reason: deck.reason })}</p>}
      <div className="controls left">
        <button type="button" className="btn nav small" disabled={busy} onClick={() => void restore()}>
          {t.restore}
        </button>
      </div>
      {failed && <p className="form-error" role="alert">{t.actionError}</p>}
    </li>
  );
}

type ProblemFilter = "all" | "feedback" | "errors";

/** What learners sent with "Report a problem", plus errors the site caught in their browsers. */
function ProblemsSection() {
  const t = useI18n().t.moderation;
  const [only, setOnly] = useState<ProblemFilter>("feedback");
  const [showHandled, setShowHandled] = useState(false);
  const [problems, setProblems] = useState<ProblemReport[] | null | "error">(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let live = true;
    void loadProblemReports({ showHandled, only }).then((result) => live && setProblems(result ?? "error"));
    return () => {
      live = false;
    };
  }, [only, showHandled, version]);

  return (
    <>
      <h2 className="section-title">{t.problemsTitle}</h2>
      <div className="problem-filters">
        <label>
          <span>{t.problemsShow}</span>
          <select value={only} onChange={(e) => setOnly(e.target.value as ProblemFilter)}>
            <option value="feedback">{t.problemsFeedback}</option>
            <option value="errors">{t.problemsErrors}</option>
            <option value="all">{t.problemsAll}</option>
          </select>
        </label>
        <label className="check-field">
          <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} />
          <span>{t.problemsShowHandled}</span>
        </label>
      </div>
      {problems === null && <p className="muted">…</p>}
      {problems === "error" && <p className="form-error" role="alert">{t.problemsLoadError}</p>}
      {problems && problems !== "error" && (problems.length === 0 ? (
        <p className="muted">{t.noProblems}</p>
      ) : (
        <ul className="report-list">
          {problems.map((p) => (
            <ProblemCard key={p.id} problem={p} onDone={refresh} />
          ))}
        </ul>
      ))}
    </>
  );
}

function ProblemCard({ problem, onDone }: { problem: ProblemReport; onDone: () => void }) {
  const t = useI18n().t.moderation;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    setFailed(false);
    const ok = await action();
    setBusy(false);
    if (ok) onDone();
    else setFailed(true);
  }

  return (
    <li className={`report-card${problem.handled ? " handled" : ""}`}>
      <p>
        <span className="tag">{problem.kind === "feedback" ? t.problemsFeedbackTag : t.problemsErrorTag}</span>{" "}
        <span className="muted">
          {new Date(problem.createdAt).toLocaleString()}
          {problem.path && ` · ${problem.path}`}
          {` · ${problem.user ?? t.problemsGuest}`}
          {problem.version && ` · ${problem.version}`}
        </span>
      </p>
      <blockquote className="report-quote">{problem.message}</blockquote>
      {(problem.detail || problem.userAgent) && (
        <details>
          <summary>{t.problemsDetails}</summary>
          {problem.userAgent && <p className="muted">{problem.userAgent}</p>}
          {problem.detail && <pre className="report-detail">{problem.detail}</pre>}
        </details>
      )}
      <div className="controls left">
        <button type="button" className="btn nav small" disabled={busy} onClick={() => void run(() => setProblemHandled(problem.id, !problem.handled))}>
          {problem.handled ? t.problemsReopen : t.problemsHandled}
        </button>
        <button type="button" className="link-button danger" disabled={busy} onClick={() => void run(() => deleteProblemReport(problem.id))}>
          {t.problemsDelete}
        </button>
      </div>
      {failed && <p className="form-error" role="alert">{t.actionError}</p>}
    </li>
  );
}
