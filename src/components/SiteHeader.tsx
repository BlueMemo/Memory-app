"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dictionaries, languages, useI18n } from "@/i18n";

export function SiteHeader() {
  const { lang, t, setLang } = useI18n();
  const pathname = usePathname();

  const tabs = [
    // Deck pages are reached from Discover, so that tab stays active there.
    { href: "/discover", label: t.header.discover, active: pathname === "/discover" || pathname.startsWith("/decks/") },
    { href: "/library", label: t.header.library, active: pathname === "/library" },
    { href: "/about", label: t.header.about, active: pathname === "/about" },
  ];

  return (
    <header className="site-header">
      <Link href="/discover" className="brand">
        {t.siteName}
      </Link>
      <nav className="tabs" aria-label={t.header.navLabel}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={tab.active ? "active" : undefined}
            aria-current={tab.active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
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
    </header>
  );
}
