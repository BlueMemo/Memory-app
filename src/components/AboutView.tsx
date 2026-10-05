"use client";

import { useI18n } from "@/i18n";
import { renderBold } from "@/lib/rich-text";

export const CONTACT_EMAIL = "memoblue.team@gmail.com";

export function AboutView() {
  const t = useI18n().t.about;
  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      {t.sections.map((s) => (
        <section key={s.title} className="about-section">
          <h2>{s.title}</h2>
          <p>{renderBold(s.body)}</p>
        </section>
      ))}

      <section className="about-section">
        <h2>{t.teamTitle}</h2>
        <p className="placeholder">{t.teamPlaceholder}</p>
      </section>

      <section className="about-section" id="contact">
        <h2>{t.contactTitle}</h2>
        <p>
          {t.contactBody} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>
    </main>
  );
}
