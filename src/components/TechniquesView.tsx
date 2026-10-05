"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { renderBold } from "@/lib/rich-text";
import { DEMO_HREF } from "./LandingView";
import { PageTabs } from "./PageTabs";

// /techniques: the memory palace, active recall and spaced repetition, each with what it is, how to
// do it, and how BlueMemo uses it. Section ids are linked from the landing page's technique cards.
export function TechniquesView() {
  const t = useI18n().t.techniques;
  return (
    <main className="page narrow techniques">
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>

      <PageTabs label={t.title} tabs={t.sections.map((s, i) => ({ id: s.id, title: `${i + 1}. ${s.title}` }))} />

      {t.sections.map((s, i) => (
        <section key={s.id} id={s.id} className="technique">
          <h2>
            <span className="technique-number">{i + 1}</span> {s.title}
          </h2>
          <p className="technique-summary">{s.summary}</p>
          <p>{renderBold(s.body)}</p>
          <h3>{t.stepsTitle}</h3>
          <ol>
            {s.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="technique-in-app">
            <h3>{t.inBlueMemoTitle}</h3>
            <p>{s.inBlueMemo}</p>
          </div>
        </section>
      ))}

      <section className="landing-final">
        <h2>{t.togetherTitle}</h2>
        <p>{renderBold(t.togetherBody)}</p>
        <Link href={DEMO_HREF} className="btn accent">
          {t.cta}
        </Link>
      </section>
    </main>
  );
}
