"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { publishDeck, unpublishDeck, usePublication } from "@/lib/publishedDecks";
import { useUser } from "@/lib/supabase/useUser";
import type { Deck } from "@/lib/types";

/** On the learner's own deck page: publish (a new version), choose Discover or link-only, copy the link. */
export function SharePanel({ deck }: { deck: Deck }) {
  const t = useI18n().t.share;
  const { user, loading: userLoading, configured } = useUser();
  const { loading, latest, available, refresh } = usePublication(deck.id, user?.id ?? null);
  const [listed, setListed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!configured || userLoading) return null;
  const link = latest ? `${window.location.origin}/shared/${latest.id}` : null;

  async function publish() {
    setBusy(true);
    setNote(null);
    const result = await publishDeck(deck, latest ? latest.listed : listed);
    setBusy(false);
    if (!result) setNote(t.error);
    refresh();
  }

  async function unpublish() {
    if (!window.confirm(t.unpublishConfirm)) return;
    setBusy(true);
    const ok = await unpublishDeck(deck.id);
    setBusy(false);
    setNote(ok ? null : t.error);
    refresh();
  }

  return (
    <section className="share-panel">
      <h2>{t.title}</h2>
      {!user ? (
        <p className="muted">
          <Link href="/account">{t.signIn}</Link>
        </p>
      ) : !available ? (
        <p className="muted">{t.unavailable}</p>
      ) : loading ? null : (
        <>
          <p className="muted">{t.lead}</p>
          {latest ? (
            <p className="share-status">
              <strong>{fill(t.published, { n: latest.version })}</strong> · {latest.listed ? t.publishedListed : t.publishedLink}
            </p>
          ) : (
            <label className="check-field">
              <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} />
              <span>
                <strong>{t.listed}</strong>
                <span className="hint">{t.listedHint}</span>
              </span>
            </label>
          )}
          <div className="controls left">
            <button type="button" className="btn accent" disabled={busy} onClick={() => void publish()}>
              {busy ? t.publishing : latest ? t.publishNew : t.publish}
            </button>
            {link && (
              <button
                type="button"
                className="btn nav"
                onClick={() => void navigator.clipboard.writeText(link).then(() => setNote(t.copied), () => setNote(link))}
              >
                {t.copyLink}
              </button>
            )}
            {latest && (
              <button type="button" className="link-button" disabled={busy} onClick={() => void unpublish()}>
                {t.unpublish}
              </button>
            )}
          </div>
          {note && <p className="hint">{note}</p>}
        </>
      )}
    </section>
  );
}
