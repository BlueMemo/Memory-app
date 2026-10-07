"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { dictionaries, languages, useI18n } from "@/i18n";
import { useEditableDecks } from "@/lib/editableDecks";
import { fill } from "@/lib/practice";
import { watchSystemTheme } from "@/lib/preferences";
import { deckCounts } from "@/lib/srs/core";
import { isDeckEnabled, useSrsData } from "@/lib/srs/store";
import { useUser } from "@/lib/supabase/useUser";
import { useNow } from "@/lib/useNow";
import { AuthSync } from "./AuthSync";
import { GearIcon } from "./GearIcon";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

function AuthStatus() {
  const t = useI18n().t;
  const { user, username, avatarUrl, loading, configured } = useUser();
  if (!configured || loading) return null;
  if (!user) {
    return (
      <Link href="/account" className="link-muted auth-status">
        {t.header.signIn}
      </Link>
    );
  }
  return (
    <Link href="/account" className="link-muted auth-status auth-status-user">
      <Avatar url={avatarUrl} name={username ?? user.email ?? null} size={28} seed={user.id} />
      <span>{username ?? t.header.setUsername}</span>
    </Link>
  );
}

/** A simple open book, drawn in the tab's colour, marking the Library tab as the place to go. */
function BookIcon() {
  return (
    <svg className="tab-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Cards waiting today across the learner's library decks (spaced repetition on): learning + due, not new ones. */
function DueBadge({ label }: { label: string }) {
  const decks = useEditableDecks();
  const srs = useSrsData();
  const now = useNow();
  let due = 0;
  for (const deck of decks) {
    if (!isDeckEnabled(srs, deck.id)) continue;
    const c = deckCounts({ deckId: deck.id, cardIds: deck.cards.map((card) => card.id), cards: srs.cards, logs: srs.logs, settings: srs.settings, now });
    due += c.learning + c.review;
  }
  if (due === 0) return null;
  const text = fill(label, { n: due });
  return (
    <span className="tab-badge" title={text} aria-label={text}>
      {due > 99 ? "99+" : due}
    </span>
  );
}

export function SiteHeader() {
  const { lang, t, setLang } = useI18n();
  const pathname = usePathname();
  useEffect(() => watchSystemTheme(), []);

  // Deck pages are reached from Discover or from the learner's own Library; user-created decks
  // are the only ones whose id starts with "user-" (see lib/userDecks.ts), so that prefix is
  // enough to tell which tab a deck page belongs to without loading the deck itself.
  const deckId = pathname.match(/^\/decks\/([^/]+)/)?.[1];
  const onUserDeck = deckId?.startsWith("user-") ?? false;

  const tabs = [
    { href: "/discover", label: t.header.discover, active: pathname === "/discover" || (!!deckId && !onUserDeck) },
    { href: "/library", label: t.header.library, active: pathname.startsWith("/library") || (!!deckId && onUserDeck), highlight: true },
    { href: "/skills", label: t.header.skills, active: pathname === "/skills" },
    { href: "/about", label: t.header.about, active: pathname === "/about" },
  ];

  return (
    <header className="site-header">
      <AuthSync />
      <Link href="/" className="brand">
        <Logo />
      </Link>
      <nav className="tabs" aria-label={t.header.navLabel}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={tab.active ? "active" : tab.highlight ? "tab-highlight" : undefined}
            aria-current={tab.active ? "page" : undefined}
          >
            {tab.highlight && <BookIcon />}
            {tab.label}
            {tab.highlight && <DueBadge label={t.header.dueToday} />}
          </Link>
        ))}
      </nav>
      <div className="header-right">
        <Link
          href="/settings"
          className={`settings-link${pathname === "/settings" ? " active" : ""}`}
          title={t.header.settings}
          aria-label={t.header.settings}
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <GearIcon size={20} />
        </Link>
        <AuthStatus />
        <div className="lang-switch" role="group" aria-label={t.header.language}>
          {languages.map((l) => (
            <button
              key={l}
              className={l === lang ? "active" : ""}
              aria-pressed={l === lang}
              title={dictionaries[l].languageName}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
