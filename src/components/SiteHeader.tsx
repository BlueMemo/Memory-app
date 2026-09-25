"use client";

import Link from "next/link";
import { dictionaries, languages, useI18n } from "@/i18n";

export function SiteHeader() {
  const { lang, t, setLang } = useI18n();
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        {t.siteName}
      </Link>
      <nav className="lang-switch" aria-label={t.header.language}>
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
      </nav>
    </header>
  );
}
