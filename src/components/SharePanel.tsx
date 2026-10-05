"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { publishDeck, unpublishDeck, usePublication, type PublishOptions } from "@/lib/publishedDecks";
import { useSrsData } from "@/lib/srs/store";
import { useUser } from "@/lib/supabase/useUser";
import type { Deck } from "@/lib/types";

/** On the learner's own deck page: publish (a new version), choose Discover or link-only, copy the link. */
export function SharePanel({ deck }: { deck: Deck }) {
  const t = useI18n().t.share;
  const { user, loading: userLoading, configured, avatarUrl } = useUser();
  const { loading, latest, available, refresh } = usePublication(deck.id, user?.id ?? null);
  const srs = useSrsData();
  const ownSettings = srs.settings.deckOverrides[deck.id];
  // Choices for the next published version; they start from the latest version's once it has loaded.
  const [choices, setChoices] = useState<PublishOptions | null>(null);
  const options: PublishOptions = choices ?? {
    listed: latest?.listed ?? true,
    showAvatar: latest?.showAvatar ?? true,
    includeSettings: latest ? latest.deckSettings !== null : true,
  };
  const choose = (patch: Partial<PublishOptions>) => setChoices({ ...options, ...patch });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!configured || userLoading) return null;
  const link = latest ? `${window.location.origin}/shared/${latest.id}` : null;

  async function publish() {
    setBusy(true);
    setNote(null);
    const result = await publishDeck(deck, options, ownSettings);
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
          {latest && (
            <p className="share-status">
              <strong>{fill(t.published, { n: latest.version })}</strong> · {latest.listed ? t.publishedListed : t.publishedLink}
            </p>
          )}
          <fieldset className="plain-fieldset publish-options">
            <legend>{latest ? t.optionsNextVersion : t.options}</legend>
            <label className="check-field">
              <input type="checkbox" checked={options.listed} onChange={(e) => choose({ listed: e.target.checked })} />
              <span>
                <strong>{t.listed}</strong>
                <span className="hint">{t.listedHint}</span>
              </span>
            </label>
            <label className="check-field">
              <input type="checkbox" checked={options.showAvatar} onChange={(e) => choose({ showAvatar: e.target.checked })} />
              <span>
                <strong>{t.showAvatar}</strong>
                <span className="hint">{avatarUrl ? t.showAvatarHint : t.noAvatarHint}</span>
              </span>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={options.includeSettings && !!ownSettings}
                disabled={!ownSettings}
                onChange={(e) => choose({ includeSettings: e.target.checked })}
              />
              <span>
                <strong>{t.includeSettings}</strong>
                <span className="hint">{ownSettings ? t.includeSettingsHint : t.noSettingsHint}</span>
              </span>
            </label>
          </fieldset>
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
