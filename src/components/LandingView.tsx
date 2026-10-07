"use client";

import Link from "next/link";
import { useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRight, ArrowsClockwise, Brain, Footprints, Lightbulb, MapPin, MapTrifold } from "@phosphor-icons/react/ssr";
import { officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import { useSavedDeckIds } from "@/lib/library";
import { useOnboarding } from "@/lib/onboarding";
import { useUser } from "@/lib/supabase/useUser";
import { useMounted } from "@/lib/useMounted";
import { useUserDecks } from "@/lib/userDecks";
import { DeckTile } from "./DeckTile";
import { RoutePreview } from "./RoutePreview";

// The demo every "try it" button starts: an ordered memory route of 10 items, so a first-time
// visitor gets the "I remembered all ten" moment the landing page promises.
export const DEMO_HREF = "/decks/largest-countries/practice";

/** Staggers the hero's entrance: each part rises in a little after the one before. */
const rise = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

// One icon per step of the technique (picture it, place it, walk it).
const stepIcons: Icon[] = [Lightbulb, MapPin, Footprints];
// The three techniques, in the order of `techniques.sections`; the first gets the large bento cell.
const techniqueIcons: Record<string, Icon> = { "memory-palace": MapTrifold, "active-recall": Brain, "spaced-repetition": ArrowsClockwise };

/**
 * The hero's buttons: "Study now" goes to the Library when the learner has decks there, otherwise to Discover;
 * newcomers also get the demo as the second choice.
 */
/**
 * The hero's buttons. New visitors (no decks, introduction not done) get "Get started", which opens the
 * introduction (/start), plus "I already have an account"; everyone else gets "Study now".
 */
function HeroActions() {
  const { t: dict } = useI18n();
  const t = dict.landing;
  const decks = useSavedDeckIds().length + useUserDecks().length;
  const onboarding = useOnboarding();
  const { user } = useUser();
  if (decks === 0 && !onboarding.completedAt) {
    return (
      <div className="hero-actions">
        <Link href="/start" className="btn accent hero-primary">
          {dict.onboarding.getStarted}
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </Link>
        {!user && (
          <Link href="/account" className="btn nav">
            {dict.onboarding.haveAccount}
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="hero-actions">
      <Link href={decks > 0 ? "/library" : "/discover"} className="btn accent hero-primary">
        {t.studyNow}
        <ArrowRight size={18} weight="bold" aria-hidden="true" />
      </Link>
      {decks === 0 && (
        <Link href={DEMO_HREF} className="btn nav">
          {t.tryCta}
        </Link>
      )}
    </div>
  );
}

/**
 * First visit: someone who isn't signed in, has no decks and hasn't been through the introduction is sent
 * straight to it (/start): questions, the 10 countries tutorial, an account offer, then back here.
 * Client-side, so link previews and search engines still see the home page.
 */
function useFirstVisitIntroduction() {
  const router = useRouter();
  const mounted = useMounted();
  const { user, loading } = useUser();
  const onboarding = useOnboarding();
  const decks = useSavedDeckIds().length + useUserDecks().length;
  const firstVisit = mounted && !loading && !user && decks === 0 && !onboarding.completedAt;
  useEffect(() => {
    if (firstVisit) router.replace("/start");
  }, [firstVisit, router]);
  return firstVisit;
}

export function LandingView() {
  const { landing: t, techniques } = useI18n().t;
  // While being sent to the introduction, show nothing rather than a flash of the home page.
  if (useFirstVisitIntroduction()) return <main className="page landing" />;
  return (
    <main className="page landing">
      {/* Text on the left, a working preview of a memory route on the right (stacked on phones). */}
      <section className="landing-hero">
        <div className="hero-copy">
          <h1 className="rise" style={rise(0)}>
            {t.title} <span className="hero-accent">{t.titleAccent}</span>
          </h1>
          <p className="landing-lead rise" style={rise(90)}>
            {t.lead}
          </p>
          <div className="rise" style={rise(180)}>
            <HeroActions />
          </div>
        </div>
        <div className="hero-visual rise" style={rise(260)}>
          <RoutePreview />
        </div>
      </section>

      {/* How it works is itself a route: three stops joined by a path. */}
      <section id="how" className="landing-section landing-how reveal">
        <h2>{t.stepsTitle}</h2>
        <ol className="how-route">
          {t.steps.map((step, i) => {
            const StepIcon = stepIcons[i];
            return (
              <li key={step.title}>
                <span className="how-stop" aria-hidden="true">
                  <StepIcon size={22} weight="duotone" />
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* The techniques as a bento: one large cell and two small ones, each with its own surface. */}
      <section className="landing-section reveal">
        <h2>{t.techniquesTitle}</h2>
        <ul className="technique-bento">
          {techniques.sections.map((s) => {
            const TechniqueIcon = techniqueIcons[s.id] ?? Brain;
            return (
              <li key={s.id} className={`bento-${s.id}`}>
                <Link href={`/techniques#${s.id}`} className="bento-cell">
                  <TechniqueIcon className="bento-icon" size={36} weight="duotone" aria-hidden="true" />
                  <h3>{s.title}</h3>
                  <p>{s.summary}</p>
                  <span className="bento-more">
                    {techniques.readMore}
                    <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="landing-section reveal">
        <div className="landing-section-head">
          <h2>{t.decksTitle}</h2>
          <Link href="/discover" className="link-muted">
            {t.allDecks}
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
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

      {/* A full-width band in the brand blue: the last call to try the demo (same label as in the hero). */}
      <section className="landing-final reveal">
        <h2>{t.finalTitle}</h2>
        <p>
          {t.finalLead} {t.tryNote}
        </p>
        <Link href={DEMO_HREF} className="btn final-cta">
          {t.tryCta}
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
