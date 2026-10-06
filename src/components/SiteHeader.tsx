"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { dictionaries, languages, useI18n } from "@/i18n";
import { watchSystemTheme } from "@/lib/preferences";
import { useUser } from "@/lib/supabase/useUser";
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
            {tab.label}
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
