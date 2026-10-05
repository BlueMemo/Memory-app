"use client";

import Link from "next/link";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { DeckTile } from "./DeckTile";

// The demo every "try it" button starts: an ordered memory route of 10 items, so a first-time
// visitor gets the "I remembered all ten" moment the landing page promises.
export const DEMO_HREF = "/decks/largest-countries/practice";

// Simple line icons for the three steps (picture it, place it, walk it).
const stepIcons = [
  <path key="bulb" d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />,
  <path key="pin" d="M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
  <path key="route" d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7.5a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6H16" />,
];

export function LandingView() {
  const { landing: t, techniques } = useI18n().t;
  return (
    <main className="page landing">
      <section className="landing-hero">
        <h1>
          {t.title} <em>{t.titleAccent}</em>
        </h1>
        <p className="landing-lead">{t.lead}</p>
        <div className="landing-ctas">
          <Link href={DEMO_HREF} className="btn accent">
            {t.tryCta}
          </Link>
          <a href="#how" className="btn nav">
            {t.howCta}
          </a>
        </div>
        <p className="landing-note">{t.tryNote}</p>
      </section>

      <section id="how" className="landing-section">
        <h2>{t.stepsTitle}</h2>
        <ol className="landing-steps">
          {t.steps.map((step, i) => (
            <li key={step.title}>
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                {stepIcons[i]}
              </svg>
              <h3>
                {i + 1}. {step.title}
              </h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section">
        <h2>{t.techniquesTitle}</h2>
        <ul className="landing-why">
          {techniques.sections.map((s) => (
            <li key={s.id}>
              <Link href={`/techniques#${s.id}`} className="technique-card">
                <h3>{s.title}</h3>
                <p>{s.summary}</p>
                <span className="technique-more">{techniques.readMore} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>{t.decksTitle}</h2>
          <Link href="/discover" className="link-muted">
            {t.allDecks} →
          </Link>
        </div>
        <ul className="deck-grid">
          {officialDecks.map((deck) => (
            <li key={deck.id}>
              <DeckTile deck={deck} />
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-final">
        <h2>{t.finalTitle}</h2>
        <p>{t.finalLead}</p>
        <Link href={DEMO_HREF} className="btn accent">
          {t.tryCta}
        </Link>
      </section>
    </main>
  );
}
