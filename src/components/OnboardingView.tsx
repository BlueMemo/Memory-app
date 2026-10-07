"use client";

import {
  ArrowLeft,
  ArrowRight,
  Backpack,
  ChalkboardTeacher,
  DotsThreeOutline,
  Exam,
  GlobeHemisphereWest,
  GraduationCap,
  InstagramLogo,
  MagnifyingGlass,
  Student,
  TiktokLogo,
  Translate,
  UsersThree,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { toggleSavedDeck, useSavedDeckIds } from "@/lib/library";
import {
  GOALS,
  SCHOOL_LEVELS,
  SOURCES,
  STUDY_LANGUAGES,
  TUTORIAL_DECK_ID,
  sendSource,
  setOnboarding,
  useOnboarding,
  type Goal,
  type SchoolLevel,
  type Source,
  type StudyLanguage,
} from "@/lib/onboarding";
import { fill } from "@/lib/practice";
import { useUser } from "@/lib/supabase/useUser";
import { LogoMark } from "./Logo";

type Step = "goal" | "language" | "level" | "source" | "tutorial";

const GOAL_ICONS: Record<Goal, Icon> = { languages: Translate, school: Backpack, exams: Exam, general: GlobeHemisphereWest };
const LEVEL_ICONS: Record<SchoolLevel, Icon> = { highSchool: Student, university: GraduationCap, other: DotsThreeOutline };
const SOURCE_ICONS: Record<Source, Icon> = {
  tiktok: TiktokLogo,
  instagram: InstagramLogo,
  youtube: YoutubeLogo,
  friend: UsersThree,
  school: ChalkboardTeacher,
  search: MagnifyingGlass,
  other: DotsThreeOutline,
};
/** Short codes on the language cards (no flags: a language isn't one country). */
const LANGUAGE_CODES: Record<StudyLanguage, string> = { english: "EN", spanish: "ES", french: "FR", german: "DE", italian: "IT", swedish: "SV", other: "…" };

/**
 * /start: Duolingo-style introduction, one question per screen with a progress bar. What you mainly study
 * (then which language, or where you study), where you heard about BlueMemo, then the 10 countries
 * tutorial (the guided practice; its results lead back here) and finally an offer to create an account.
 */
export function OnboardingView({ finalStep, skipWelcome }: { finalStep: boolean; skipWelcome: boolean }) {
  const { t: dict } = useI18n();
  const t = dict.onboarding;
  const router = useRouter();
  const state = useOnboarding();
  const saved = useSavedDeckIds().includes(TUTORIAL_DECK_ID);
  const [source, setSource] = useState<Source | null>(null);
  const [index, setIndex] = useState(0);
  // The welcome screen comes first, unless "Get started" was already pressed on the home page.
  const [welcomed, setWelcomed] = useState(skipWelcome);

  if (finalStep) return <AccountStep />;
  if (!welcomed) return <WelcomeStep onStart={() => setWelcomed(true)} />;

  const followUp: Step[] = state.goal === "languages" ? ["language"] : state.goal === "school" ? ["level"] : [];
  const steps: Step[] = ["goal", ...followUp, "source", "tutorial"];
  const step = steps[Math.min(index, steps.length - 1)];
  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  const startTutorial = async () => {
    if (!saved) await toggleSavedDeck(TUTORIAL_DECK_ID);
    setOnboarding({ tutorialPending: true });
    router.push(`/decks/${TUTORIAL_DECK_ID}/practice`);
  };

  let content: ReactNode;
  let canContinue = false;
  let onContinue = next;
  switch (step) {
    case "goal":
      canContinue = state.goal !== null;
      content = (
        <Question title={t.goalTitle} lead={t.goalLead}>
          {GOALS.map((g) => (
            <Option key={g} icon={GOAL_ICONS[g]} title={t.goals[g].title} text={t.goals[g].text} selected={state.goal === g} onSelect={() => setOnboarding({ goal: g })} />
          ))}
        </Question>
      );
      break;
    case "language":
      canContinue = state.language !== null;
      content = (
        <Question title={t.languageTitle} compact>
          {STUDY_LANGUAGES.map((l) => (
            <Option key={l} badge={LANGUAGE_CODES[l]} title={t.languages[l]} selected={state.language === l} onSelect={() => setOnboarding({ language: l })} />
          ))}
        </Question>
      );
      break;
    case "level":
      canContinue = state.level !== null;
      content = (
        <Question title={t.levelTitle}>
          {SCHOOL_LEVELS.map((l) => (
            <Option key={l} icon={LEVEL_ICONS[l]} title={t.levels[l]} selected={state.level === l} onSelect={() => setOnboarding({ level: l })} />
          ))}
        </Question>
      );
      break;
    case "source":
      canContinue = source !== null;
      onContinue = () => {
        if (source) void sendSource(source);
        next();
      };
      content = (
        <Question title={t.sourceTitle} lead={t.sourceLead} compact>
          {SOURCES.map((s) => (
            <Option key={s} icon={SOURCE_ICONS[s]} title={t.sources[s]} selected={source === s} onSelect={() => setSource(s)} />
          ))}
        </Question>
      );
      break;
    case "tutorial":
      content = (
        <section className="onboarding-question onboarding-tutorial">
          <h1>{t.tutorialTitle}</h1>
          <p className="onboarding-lead">{t.tutorialLead}</p>
          <button type="button" className="btn accent onboarding-continue" onClick={() => void startTutorial()}>
            {t.tutorialStart}
          </button>
        </section>
      );
      break;
  }

  return (
    <main className="page narrow onboarding">
      <div className="onboarding-top">
        {index > 0 ? (
          <button type="button" className="onboarding-back" onClick={back} aria-label={t.back}>
            <ArrowLeft size={20} weight="bold" aria-hidden="true" />
          </button>
        ) : (
          // Nothing to go back to on the first question (new visitors are sent here from the home page).
          <span className="onboarding-back" aria-hidden="true" />
        )}
        <div
          className="onboarding-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length + 1}
          aria-valuenow={index + 1}
          aria-label={fill(t.progress, { n: index + 1, total: steps.length + 1 })}
        >
          <span style={{ width: `${((index + 1) / (steps.length + 1)) * 100}%` }} />
        </div>
        <CloseButton />
      </div>

      {/* Keyed by step, so each question plays its entrance. */}
      <div key={step} className="onboarding-step">
        {content}
      </div>

      {step !== "tutorial" && (
        <button type="button" className="btn accent onboarding-continue" disabled={!canContinue} onClick={onContinue}>
          {t.continue}
        </button>
      )}
    </main>
  );
}

function Question({ title, lead, compact, children }: { title: string; lead?: string; compact?: boolean; children: ReactNode }) {
  return (
    <section className="onboarding-question">
      <h1>{title}</h1>
      {lead && <p className="onboarding-lead">{lead}</p>}
      <div className={`onboarding-options${compact ? " compact" : ""}`} role="radiogroup" aria-label={title}>
        {children}
      </div>
    </section>
  );
}

function Option(props: { icon?: Icon; badge?: string; title: string; text?: string; selected: boolean; onSelect: () => void }) {
  const Glyph = props.icon;
  return (
    <button type="button" role="radio" aria-checked={props.selected} className={`onboarding-option${props.selected ? " selected" : ""}`} onClick={props.onSelect}>
      {Glyph ? <Glyph size={28} weight="duotone" aria-hidden="true" /> : <span className="onboarding-badge">{props.badge}</span>}
      <span className="onboarding-option-text">
        <strong>{props.title}</strong>
        {props.text && <span>{props.text}</span>}
      </span>
    </button>
  );
}

/** Leaves the introduction for the home page and marks it done, so the home page doesn't send you back. */
function CloseButton() {
  const t = useI18n().t.onboarding;
  return (
    <Link
      href="/"
      className="onboarding-close"
      aria-label={t.close}
      title={t.close}
      onClick={() => setOnboarding({ completedAt: new Date().toISOString(), tutorialPending: false })}
    >
      <X size={20} weight="bold" aria-hidden="true" />
    </Link>
  );
}

/**
 * The first screen of the introduction: what's about to happen, one big obvious "Get started", and a quiet
 * way in for people who already have an account.
 */
function WelcomeStep({ onStart }: { onStart: () => void }) {
  const t = useI18n().t.onboarding;
  const { user } = useUser();
  return (
    <main className="onboarding-welcome">
      <div className="onboarding-welcome-close">
        <CloseButton />
      </div>
      <div className="welcome-card">
        <div className="welcome-mark rise">
          <LogoMark size={96} />
        </div>
        <h1 className="rise" style={{ animationDelay: "80ms" }}>
          {t.welcomeTitle}
        </h1>
        <p className="welcome-lead rise" style={{ animationDelay: "160ms" }}>
          {t.welcomeLead}
        </p>
        <ol className="welcome-steps rise" style={{ animationDelay: "240ms" }}>
          {t.welcomeSteps.map((step, i) => (
            <li key={step}>
              <span className="welcome-step-n">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <button type="button" className="btn accent welcome-start rise" style={{ animationDelay: "320ms" }} onClick={onStart} autoFocus>
          {t.getStarted}
          <ArrowRight size={20} weight="bold" aria-hidden="true" />
        </button>
        {!user && (
          <Link href="/account" className="welcome-signin rise" style={{ animationDelay: "380ms" }}>
            {t.haveAccount}
          </Link>
        )}
      </div>
    </main>
  );
}

/** The last step, after the tutorial: create a free account, or carry on as a guest. */
function AccountStep() {
  const t = useI18n().t.onboarding;
  const { user, configured, loading } = useUser();
  const finish = () => setOnboarding({ completedAt: new Date().toISOString(), tutorialPending: false });
  const signedIn = !loading && !!user;

  return (
    <main className="page narrow onboarding">
      <div className="onboarding-top">
        <span className="onboarding-back" aria-hidden="true" />
        <div className="onboarding-progress" aria-hidden="true">
          <span style={{ width: "100%" }} />
        </div>
        <CloseButton />
      </div>
      <section className="onboarding-question onboarding-tutorial">
        <h1>{signedIn ? t.accountDoneTitle : t.accountTitle}</h1>
        <p className="onboarding-lead">{signedIn ? t.accountDoneLead : t.accountLead}</p>
        <div className="onboarding-account-actions">
          {!signedIn && configured && (
            <Link href="/account?signup=1" className="btn accent onboarding-continue" onClick={finish}>
              {t.accountCreate}
            </Link>
          )}
          {/* The introduction ends on the home page. */}
          <Link href="/" className={`btn ${signedIn || !configured ? "accent" : "nav"} onboarding-continue`} onClick={finish}>
            {signedIn || !configured ? t.toHome : t.accountLater}
          </Link>
        </div>
      </section>
    </main>
  );
}
