"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { MAX_NOTE_LENGTH, REPORT_REASONS, reportDeck, type ReportReason } from "@/lib/moderation";
import { useUser } from "@/lib/supabase/useUser";
import { CONTACT_EMAIL } from "./AboutView";

/** "Report this deck" on a published deck's page: a reason and an optional note, for the moderators. */
export function ReportDeck({ publishedId, authorId }: { publishedId: string; authorId: string }) {
  const t = useI18n().t.moderation;
  const { user, loading, configured } = useUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"sent" | "duplicate" | "error" | null>(null);

  if (!configured || loading || user?.id === authorId) return null;

  if (result === "sent" || result === "duplicate") {
    return <p className="fine-print report-note">{result === "sent" ? t.sent : t.alreadyReported}</p>;
  }

  if (!open) {
    return (
      <p className="fine-print report-note">
        <button type="button" className="link-button inline" onClick={() => setOpen(true)}>
          {t.reportOpen}
        </button>
      </p>
    );
  }

  if (!user) {
    return (
      <div className="report-form">
        <p className="muted">
          <Link href="/account">{t.signInToReport}</Link> {t.orEmail} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <button type="button" className="link-button" onClick={() => setOpen(false)}>
          {t.cancel}
        </button>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setSending(true);
    const outcome = await reportDeck(publishedId, reason, note);
    setSending(false);
    setResult(outcome === "ok" ? "sent" : outcome === "duplicate" ? "duplicate" : "error");
  };

  return (
    <form className="report-form" onSubmit={submit}>
      <h2 className="section-title">{t.reportTitle}</h2>
      <p className="muted">{t.reportLead}</p>
      <fieldset className="plain-fieldset">
        <legend>{t.reasonLabel}</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="check-field">
            <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} required />
            <span>{t.reasons[r]}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="report-note">{t.noteLabel}</label>
        <textarea id="report-note" rows={3} maxLength={MAX_NOTE_LENGTH} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} />
      </div>
      {result === "error" && <p className="form-error">{t.error}</p>}
      <div className="controls left">
        <button type="submit" className="btn accent small" disabled={sending || !reason}>
          {sending ? t.sending : t.send}
        </button>
        <button type="button" className="btn nav small" onClick={() => setOpen(false)} disabled={sending}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
