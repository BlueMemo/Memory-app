"use client";

import { useEffect } from "react";
import { ReportProblemButton } from "@/components/ReportProblem";
import { useI18n } from "@/i18n";
import { reportError } from "@/lib/problemReports";

// Shown when a page crashes while rendering. The error is reported automatically; the learner can retry
// or add what they were doing.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useI18n().t.problems;
  useEffect(() => reportError(error), [error]);
  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{t.crashTitle}</h1>
        <p>{t.crashLead}</p>
      </section>
      <div className="controls left">
        <button type="button" className="btn accent" onClick={reset}>
          {t.retry}
        </button>
        <ReportProblemButton className="btn nav" detail={`After a crash: ${error.name}: ${error.message}`} />
      </div>
    </main>
  );
}
