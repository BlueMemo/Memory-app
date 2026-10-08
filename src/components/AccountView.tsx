"use client";

import { X } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import { PRESET_AVATARS, presetAvatarValue } from "@/lib/avatars";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { checkUsername, isValidUsername } from "@/lib/supabase/profiles";
import { useUser } from "@/lib/supabase/useUser";
import { AccountDashboard } from "./AccountDashboard";
import { Avatar } from "./Avatar";
import { renderLegal } from "./LegalView";
import { LanguageSwitch } from "./OnboardingView";

type Mode = "signIn" | "signUp" | "forgotPassword";
type T = Dict["account"];
type Status = { type: "error" | "success"; message: string } | null;

function mapAuthError(message: string, t: T): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return t.errorInvalidCredentials;
  if (m.includes("email not confirmed")) return t.errorEmailNotConfirmed;
  if (m.includes("already registered") || m.includes("already exists")) return t.errorUserExists;
  if (m.includes("password should be at least") || m.includes("password should contain")) return t.errorWeakPassword;
  return t.errorGeneric;
}

export type AccountNotice = "confirmed" | "reset-link" | "link-error";

export function AccountView({ startWithSignUp = false, notice = null }: { startWithSignUp?: boolean; notice?: AccountNotice | null }) {
  const t = useI18n().t.account;
  const { user, username, avatarUrl, loading, configured } = useUser();

  if (!configured) {
    return (
      <main className="page narrow">
        <section className="page-intro">
          <h1>{t.title}</h1>
        </section>
        <p className="empty-state">{t.notConfigured}</p>
      </main>
    );
  }

  if (loading) return null;

  if (user) {
    return <AccountDashboard userId={user.id} email={user.email ?? ""} createdAt={user.created_at} username={username} avatarUrl={avatarUrl} />;
  }

  return (
    <main className="page narrow">
      {/* The header is hidden here (SiteHeader): the language and a ✕ back to the home page instead. */}
      <div className="account-corner">
        <LanguageSwitch />
        <Link href="/" className="onboarding-close" aria-label={t.close} title={t.close}>
          <X size={20} weight="bold" aria-hidden="true" />
        </Link>
      </div>
      <section className="page-intro">
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
      </section>
      {notice && (
        <p className={`notice ${notice === "confirmed" ? "success" : "error"}`} role="status">
          {notice === "confirmed" ? t.noticeConfirmed : notice === "reset-link" ? t.noticeResetLink : t.noticeLinkError}
        </p>
      )}
      <SignedOut t={t} startWithSignUp={startWithSignUp} />
    </main>
  );
}

function SignedOut({ t, startWithSignUp }: { t: T; startWithSignUp: boolean }) {
  const { lang, t: dict } = useI18n();
  const legal = dict.legal;
  const [mode, setMode] = useState<Mode>(startWithSignUp ? "signUp" : "signIn");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  // A ready-made profile picture, chosen while signing up (null: one is picked from the user id later).
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setStatus(null);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const { error } = await getSupabaseBrowserClient()!.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setStatus({ type: "error", message: mapAuthError(error.message, t) });
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!isValidUsername(username)) {
      setStatus({ type: "error", message: t.errorUsernameInvalid });
      return;
    }
    setSubmitting(true);
    const check = await checkUsername(username);
    if (check !== "available") {
      setSubmitting(false);
      setStatus({ type: "error", message: check === "taken" ? t.errorUsernameTaken : t.errorGeneric });
      return;
    }
    const { error } = await getSupabaseBrowserClient()!.auth.signUp({
      email,
      password,
      options: {
        // lang picks the language of account emails (supabase/email-templates).
        // The picture is stored on the profile at the first sign-in (there's no session before the email is
        // confirmed), see applySignupAvatar in AuthSync.
        data: { username, lang, ...(avatar ? { avatar } : {}) },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    });
    setSubmitting(false);
    setStatus(
      error ? { type: "error", message: mapAuthError(error.message, t) } : { type: "success", message: t.confirmEmailSent },
    );
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const { error } = await getSupabaseBrowserClient()!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/reset-password`,
    });
    setSubmitting(false);
    setStatus(error ? { type: "error", message: mapAuthError(error.message, t) } : { type: "success", message: t.resetLinkSent });
  };

  if (mode === "forgotPassword") {
    return (
      <div>
        <h2 className="section-title">{t.forgotPasswordTitle}</h2>
        <p className="muted">{t.forgotPasswordText}</p>
        <form onSubmit={handleForgotPassword}>
          <div className="field">
            <label htmlFor="acct-email">{t.emailLabel}</label>
            <input
              id="acct-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
            />
          </div>
          {status && <p className={status.type === "error" ? "form-error" : "form-success"} role={status.type === "error" ? "alert" : "status"}>{status.message}</p>}
          <div className="controls left">
            <button type="submit" className="btn accent" disabled={submitting}>
              {t.sendResetLink}
            </button>
          </div>
        </form>
        <button className="link-button" onClick={() => switchMode("signIn")}>
          {t.backToSignIn}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="lang-switch" role="group" aria-label={t.title}>
        <button type="button" className={mode === "signIn" ? "active" : ""} aria-pressed={mode === "signIn"} onClick={() => switchMode("signIn")}>
          {t.signInTab}
        </button>
        <button type="button" className={mode === "signUp" ? "active" : ""} aria-pressed={mode === "signUp"} onClick={() => switchMode("signUp")}>
          {t.signUpTab}
        </button>
      </div>

      <form onSubmit={mode === "signIn" ? handleSignIn : handleSignUp}>
        <div className="field">
          <label htmlFor="acct-email">{t.emailLabel}</label>
          <input
            id="acct-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
          />
        </div>
        {mode === "signUp" && (
          <div className="field">
            <label htmlFor="acct-username">{t.usernameLabel}</label>
            <input
              id="acct-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.usernamePlaceholder}
            />
          </div>
        )}
        {mode === "signUp" && (
          <div className="field">
            <span className="field-heading">{t.avatarLabel}</span>
            <div className="signup-avatar">
              <Avatar url={avatar} name={null} size={56} seed={username || "bluememo"} />
              <button type="button" className="btn nav small" aria-expanded={pickingAvatar} onClick={() => setPickingAvatar((p) => !p)}>
                {avatar ? t.avatarChange : t.avatarChoose}
              </button>
            </div>
            {pickingAvatar && (
              <div className="avatar-picker" role="group" aria-label={t.avatarLabel}>
                {PRESET_AVATARS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={avatar === presetAvatarValue(a.id) ? "selected" : undefined}
                    aria-pressed={avatar === presetAvatarValue(a.id)}
                    aria-label={a.id}
                    onClick={() => {
                      setAvatar(presetAvatarValue(a.id));
                      setPickingAvatar(false);
                    }}
                  >
                    <Avatar url={presetAvatarValue(a.id)} name={null} size={44} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="field">
          <label htmlFor="acct-password">{t.passwordLabel}</label>
          <input
            id="acct-password"
            name="password"
            type="password"
            autoComplete={mode === "signUp" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signUp" ? t.passwordPlaceholderNew : undefined}
          />
        </div>
        {mode === "signUp" && <p className="consent-note">{renderLegal(legal.signUpConsent)}</p>}
        {status && <p className={status.type === "error" ? "form-error" : "form-success"} role={status.type === "error" ? "alert" : "status"}>{status.message}</p>}
        <div className="controls left">
          <button type="submit" className="btn accent" disabled={submitting}>
            {mode === "signIn" ? t.signInButton : t.signUpButton}
          </button>
        </div>
      </form>

      {mode === "signIn" && (
        <button className="link-button" onClick={() => switchMode("forgotPassword")}>
          {t.forgotPassword}
        </button>
      )}
    </div>
  );
}
