"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { sendProblemReport } from "@/lib/problemReports";
import { CONTACT_EMAIL } from "./AboutView";

/** "Report a problem": a link that opens a short form, sent to `problem_reports` with the page it came from. */
export function ReportProblemButton({ className = "link-button", detail }: { className?: string; detail?: string }) {
  const t = useI18n().t.problems;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {t.button}
      </button>
      {open && <ReportProblemDialog detail={detail} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportProblemDialog({ detail, onClose }: { detail?: string; onClose: () => void }) {
  const t = useI18n().t.problems;
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setStatus((await sendProblemReport("feedback", message, detail)) ? "sent" : "error");
  };

  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="dialog face" role="dialog" aria-modal="true" aria-label={t.title}>
        <h2>{t.title}</h2>
        {status === "sent" ? (
          <>
            <p className="form-success">{t.thanks}</p>
            <div className="controls left">
              <button type="button" className="btn accent" onClick={onClose}>
                {t.close}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="muted">{t.lead}</p>
            <div className="field">
              <label htmlFor="problem-message">{t.label}</label>
              <textarea
                id="problem-message"
                required
                autoFocus
                maxLength={4000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.placeholder}
              />
            </div>
            <p className="consent-note">
              {t.included} {t.reply} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            {status === "error" && <p className="form-error">{t.error}</p>}
            <div className="controls left">
              <button type="submit" className="btn accent" disabled={status === "sending" || !message.trim()}>
                {status === "sending" ? t.sending : t.send}
              </button>
              <button type="button" className="btn nav" onClick={onClose}>
                {t.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
