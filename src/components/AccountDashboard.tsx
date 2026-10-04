"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { getDeck, officialDecks } from "@/decks";
import { useI18n } from "@/i18n";
import type { Dict } from "@/i18n/en";
import {
  bestStreak,
  countByDay,
  currentStreak,
  formatAgo,
  HEATMAP_WEEKS,
  heatmapWeeks,
  recentActivity,
  type HeatLevel,
} from "@/lib/activity";
import { useAccountActivity, type AccountActivity } from "@/lib/accountActivity";
import { resolveDeck, useDeckOverrides } from "@/lib/deckOverrides";
import { useEditableDecks } from "@/lib/editableDecks";
import { readAvatarFile } from "@/lib/images";
import { fill } from "@/lib/practice";
import { deckCounts } from "@/lib/srs/core";
import { isDeckEnabled, useSrsData, useSrsStatus } from "@/lib/srs/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { checkUsername, claimUsername, isValidUsername, saveAvatar, setUsername as changeUsername } from "@/lib/supabase/profiles";
import { notifyProfileChanged } from "@/lib/supabase/useUser";
import { useNow } from "@/lib/useNow";
import { useUserDecks } from "@/lib/userDecks";
import { Avatar } from "./Avatar";

type T = Dict["account"];

interface Props {
  userId: string;
  email: string;
  /** ISO timestamp of when the account was created. */
  createdAt: string | undefined;
  username: string | null;
  avatarUrl: string | null;
}

/** The signed-in account page: who you are, how you're doing, and the account's own settings. */
export function AccountDashboard({ userId, email, createdAt, username, avatarUrl }: Props) {
  const { lang, t: dict } = useI18n();
  const t = dict.account;
  const activity = useAccountActivity(userId);

  return (
    <main className="page account-page">
      <ProfileHead t={t} userId={userId} email={email} createdAt={createdAt} username={username} avatarUrl={avatarUrl} lang={lang} />
      {!username && <ChooseUsername t={t} userId={userId} />}
      {activity.status === "error" && <p className="form-error">{t.activityError}</p>}

      <h2 className="section-title">{t.glanceTitle}</h2>
      <Stats t={t} activity={activity} />

      <h2 className="section-title">{t.activityTitle}</h2>
      <Activity t={t} activity={activity} lang={lang} />

      <h2 className="section-title">{t.recentTitle}</h2>
      <Recent t={t} activity={activity} lang={lang} />

      <h2 className="section-title">{t.detailsTitle}</h2>
      <Details t={t} userId={userId} username={username} />
    </main>
  );
}

function ProfileHead({ t, userId, email, createdAt, username, avatarUrl, lang }: Props & { t: T; lang: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const change = async (read: () => Promise<string | null>) => {
    setBusy(true);
    setPhotoError(false);
    try {
      const ok = await saveAvatar(userId, await read());
      if (ok) notifyProfileChanged();
      else setPhotoError(true);
    } catch {
      setPhotoError(true);
    }
    setBusy(false);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void change(() => readAvatarFile(file));
  };

  const since = createdAt ? new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(new Date(createdAt)) : null;

  return (
    <section className="account-head">
      <Avatar url={avatarUrl} name={username ?? email} size={96} />
      <div className="account-id">
        <h1 className="account-name">{username ?? t.title}</h1>
        <p className="muted account-meta">
          {email}
          {since && ` · ${fill(t.memberSince, { date: since })}`}
        </p>
        <div className="avatar-actions">
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
          <button className="btn nav small" disabled={!username || busy} onClick={() => fileInput.current?.click()}>
            {avatarUrl ? t.changePhoto : t.addPhoto}
          </button>
          {avatarUrl && (
            <button className="link-button inline" disabled={busy} onClick={() => void change(async () => null)}>
              {t.removePhoto}
            </button>
          )}
        </div>
        {!username && <p className="hint">{t.photoNeedsUsername}</p>}
        {photoError && <p className="form-error">{t.errorPhoto}</p>}
      </div>
      <button
        className="btn nav"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await getSupabaseBrowserClient()?.auth.signOut();
          setSigningOut(false);
        }}
      >
        {t.signOut}
      </button>
    </section>
  );
}

function ChooseUsername({ t, userId }: { t: T; userId: string }) {
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
    if (claimError) setError(t.errorUsernameTaken);
    else notifyProfileChanged();
  };

  return (
    <div className="empty-state account-claim">
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

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/** Counts the learner's own decks and saved decks, plus what spaced repetition has due, like the library's "due" list. */
function Stats({ t, activity }: { t: T; activity: AccountActivity }) {
  const own = useUserDecks();
  const editable = useEditableDecks();
  const overrides = useDeckOverrides();
  const srs = useSrsData();
  const srsStatus = useSrsStatus();
  const now = useNow();

  const cards = editable.reduce((n, d) => n + d.cards.length, 0);
  // Official decks can have spaced repetition on without being saved, so all of them are checked.
  const due =
    srsStatus === "loading"
      ? "–"
      : [...own, ...officialDecks.map((d) => resolveDeck(d, overrides))]
          .filter((d) => isDeckEnabled(srs, d.id))
          .reduce((n, d) => {
            const c = deckCounts({ deckId: d.id, cardIds: d.cards.map((card) => card.id), cards: srs.cards, logs: srs.logs, settings: srs.settings, now });
            return n + c.new + c.learning + c.review;
          }, 0);

  return (
    <div className="stat-grid">
      <Stat value={own.length} label={t.statDecks} />
      <Stat value={cards} label={t.statCards} />
      <Stat value={due} label={t.statDue} />
      <Stat value={activity.status === "loading" ? "–" : activity.testCount} label={t.statTests} />
    </div>
  );
}

function Activity({ t, activity, lang }: { t: T; activity: AccountActivity; lang: string }) {
  const now = useNow();
  const { streak, best, weeks, activeDays } = useMemo(() => {
    const counts = countByDay([...activity.reviewTimes, ...activity.tests.map((r) => r.at)]);
    const weeks = heatmapWeeks(counts, now);
    return {
      streak: currentStreak(counts, now),
      best: bestStreak(counts),
      weeks,
      activeDays: weeks.flat().filter((c) => c.count > 0).length,
    };
  }, [activity, now]);

  const date = new Intl.DateTimeFormat(lang, { month: "short", day: "numeric" });
  const loading = activity.status === "loading";

  return (
    <>
      <div className="stat-grid three">
        <Stat value={loading ? "–" : streak} label={t.statStreak} />
        <Stat value={loading ? "–" : best} label={t.statBestStreak} />
        <Stat value={loading ? "–" : activeDays} label={fill(t.statActiveDays, { weeks: HEATMAP_WEEKS })} />
      </div>
      <div className="heatmap-wrap">
        <div className="heatmap" role="img" aria-label={fill(t.heatSummary, { weeks: HEATMAP_WEEKS, n: activeDays })}>
          {weeks.map((week, w) => (
            <div className="heat-week" key={w}>
              {week.map((c) =>
                c.future ? (
                  <span key={c.key} className="heat-cell future" />
                ) : (
                  <span
                    key={c.key}
                    className={`heat-cell level-${c.level}`}
                    title={fill(c.count ? t.heatCell : t.heatCellNone, { date: date.format(c.date), n: c.count })}
                  />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="heat-legend" aria-hidden="true">
          <span>{t.heatLess}</span>
          {([0, 1, 2, 3, 4] as HeatLevel[]).map((l) => (
            <span key={l} className={`heat-cell level-${l}`} />
          ))}
          <span>{t.heatMore}</span>
        </div>
      </div>
    </>
  );
}

function Recent({ t, activity, lang }: { t: T; activity: AccountActivity; lang: string }) {
  const now = useNow();
  const own = useUserDecks();
  const items = useMemo(() => recentActivity(activity.tests, activity.reviewTimes), [activity]);

  if (activity.status === "loading") return null;
  if (items.length === 0) return <p className="empty-state">{t.recentEmpty}</p>;

  return (
    <ul className="activity-list">
      {items.map((item) => {
        const ago = formatAgo(item.at, now, lang);
        if (item.kind === "review") {
          return (
            <li key={`r-${item.at.getTime()}`}>
              <span>{item.count === 1 ? t.recentReviewOne : fill(t.recentReview, { n: item.count })}</span>
              <span className="muted">{ago}</span>
            </li>
          );
        }
        const deck = getDeck(item.deckId) ?? own.find((d) => d.id === item.deckId);
        const text = fill(t.recentTest, { score: item.score, total: item.total, deck: deck?.title ?? t.deletedDeck });
        return (
          <li key={`t-${item.at.getTime()}`}>
            {deck ? (
              <Link href={`/decks/${deck.id}`} className="due-title">
                {text}
              </Link>
            ) : (
              <span>{text}</span>
            )}
            <span className="muted">{ago}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Details({ t, userId, username }: { t: T; userId: string; username: string | null }) {
  return (
    <div className="account-details">
      {username && <UsernameEditor t={t} userId={userId} username={username} />}
      <PasswordEditor t={t} />
      <div className="account-links">
        <Link href="/settings" className="tile-open">
          {t.studyOptions}
        </Link>
        <Link href="/library" className="tile-open">
          {t.goToLibrary}
        </Link>
      </div>
    </div>
  );
}

function UsernameEditor({ t, userId, username }: { t: T; userId: string; username: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (value === username) {
      setEditing(false);
      return;
    }
    if (!isValidUsername(value)) {
      setError(t.errorUsernameInvalid);
      return;
    }
    setSubmitting(true);
    const check = await checkUsername(value);
    const result = check === "available" ? await changeUsername(userId, value) : check;
    setSubmitting(false);
    if (result === "ok") {
      notifyProfileChanged();
      setEditing(false);
    } else {
      setError(result === "taken" ? t.errorUsernameTaken : t.errorGeneric);
    }
  };

  if (!editing) {
    return (
      <div className="detail-row">
        <span className="detail-label">{t.yourUsername}</span>
        <strong>{username}</strong>
        <button
          className="link-button inline"
          onClick={() => {
            setValue(username);
            setEditing(true);
          }}
        >
          {t.changeUsername}
        </button>
      </div>
    );
  }

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="change-username">{t.usernameLabel}</label>
        <input id="change-username" type="text" required value={value} onChange={(e) => setValue(e.target.value)} placeholder={t.usernamePlaceholder} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="controls left">
        <button type="submit" className="btn accent small" disabled={submitting}>
          {t.saveUsername}
        </button>
        <button type="button" className="btn nav small" onClick={() => setEditing(false)}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function PasswordEditor({ t }: { t: T }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const { error } = await getSupabaseBrowserClient()!.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setStatus({ ok: false, message: error.message.toLowerCase().includes("at least") ? t.errorWeakPassword : t.errorGeneric });
    } else {
      setPassword("");
      setStatus({ ok: true, message: t.passwordUpdated });
    }
  };

  return (
    <form className="detail-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="change-password">{t.changePasswordTitle}</label>
        <input
          id="change-password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.newPasswordLabel}
          autoComplete="new-password"
        />
      </div>
      {status && <p className={status.ok ? "form-success" : "form-error"}>{status.message}</p>}
      <div className="controls left">
        <button type="submit" className="btn nav small" disabled={submitting}>
          {t.updatePassword}
        </button>
      </div>
    </form>
  );
}
