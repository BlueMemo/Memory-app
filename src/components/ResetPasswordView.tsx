"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/useUser";

export function ResetPasswordView() {
  const t = useI18n().t.account;
  const { user, loading, configured } = useUser();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!configured || loading) return null;

  if (!user) {
    return (
      <main className="page narrow">
        <section className="page-intro">
          <h1>{t.newPasswordTitle}</h1>
        </section>
        <p className="empty-state">{t.invalidResetLink}</p>
        <Link href="/account" className="link-muted">
          {t.backToSignIn}
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="page narrow">
        <section className="page-intro">
          <h1>{t.newPasswordTitle}</h1>
        </section>
        <p className="form-success">{t.passwordUpdated}</p>
        <Link href="/library" className="tile-open">
          {t.goToLibrary}
        </Link>
      </main>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await getSupabaseBrowserClient()!.auth.updateUser({ password });
    setSubmitting(false);
    if (error) setError(t.errorWeakPassword);
    else setDone(true);
  };

  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{t.newPasswordTitle}</h1>
      </section>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="new-password">{t.newPasswordLabel}</label>
          <input id="new-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="controls left">
          <button type="submit" className="btn accent" disabled={submitting}>
            {t.updatePassword}
          </button>
        </div>
      </form>
    </main>
  );
}
