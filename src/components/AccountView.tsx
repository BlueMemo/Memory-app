"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { checkUsername, claimUsername, isValidUsername } from "@/lib/supabase/profiles";
import { notifyUsernameChanged, useUser } from "@/lib/supabase/useUser";

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

export function AccountView() {
  const t = useI18n().t.account;
  const { user, username, loading, configured } = useUser();

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

  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{t.title}</h1>
        {!user && <p>{t.lead}</p>}
      </section>
      {user ? <SignedIn t={t} userId={user.id} email={user.email ?? ""} username={username} /> : <SignedOut t={t} />}
    </main>
  );
}

function SignedIn({ t, userId, email, username }: { t: T; userId: string; email: string; username: string | null }) {
  const [submitting, setSubmitting] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(username);

  return (
    <div>
      <p>
        {t.signedInAs} <strong>{email}</strong>
      </p>
      {currentUsername ? (
        <p>
          {t.yourUsername}: <strong>{currentUsername}</strong>
        </p>
      ) : (
        <ChooseUsername t={t} userId={userId} onSaved={setCurrentUsername} />
      )}
      <div className="controls left">
        <button
          className="btn nav"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await getSupabaseBrowserClient()?.auth.signOut();
            setSubmitting(false);
          }}
        >
          {t.signOut}
        </button>
      </div>
      <Link href="/library" className="tile-open">
        {t.goToLibrary}
      </Link>
    </div>
  );
}

function ChooseUsername({ t, userId, onSaved }: { t: T; userId: string; onSaved: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidUsername(username)) {
      setError(t.errorUsernameInvalid);
      return;
    }
    setSubmitting(true);
    const check = await checkUsername(username);
    if (check !== "available") {
      setSubmitting(false);
      setError(check === "taken" ? t.errorUsernameTaken : t.errorGeneric);
      return;
    }
    const { error: claimError } = await claimUsername(userId, username);
    setSubmitting(false);
    if (claimError) {
      setError(t.errorUsernameTaken);
    } else {
      notifyUsernameChanged();
      onSaved(username);
    }
  };

  return (
    <div className="empty-state">
      <p>{t.chooseUsernameText}</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="claim-username">{t.usernameLabel}</label>
          <input
            id="claim-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t.usernamePlaceholder}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="controls left">
          <button type="submit" className="btn accent" disabled={submitting}>
            {t.saveUsername}
          </button>
        </div>
      </form>
    </div>
  );
}

function SignedOut({ t }: { t: T }) {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
        data: { username },
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
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
            />
          </div>
          {status && <p className={status.type === "error" ? "form-error" : "form-success"}>{status.message}</p>}
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
      <div className="lang-switch" role="group">
        <button className={mode === "signIn" ? "active" : ""} onClick={() => switchMode("signIn")}>
          {t.signInTab}
        </button>
        <button className={mode === "signUp" ? "active" : ""} onClick={() => switchMode("signUp")}>
          {t.signUpTab}
        </button>
      </div>

      <form onSubmit={mode === "signIn" ? handleSignIn : handleSignUp}>
        <div className="field">
          <label htmlFor="acct-email">{t.emailLabel}</label>
          <input
            id="acct-email"
            type="email"
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
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.usernamePlaceholder}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="acct-password">{t.passwordLabel}</label>
          <input
            id="acct-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signUp" ? t.passwordPlaceholderNew : undefined}
          />
        </div>
        {status && <p className={status.type === "error" ? "form-error" : "form-success"}>{status.message}</p>}
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
