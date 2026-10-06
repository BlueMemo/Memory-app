"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n";
import { ReportProblemButton } from "./ReportProblem";

/** Links to the legal pages at the bottom of every page, except while studying (the study bar is there). */
export function SiteFooter() {
  const t = useI18n().t.legal;
  const path = usePathname();
  if (/^\/decks\/[^/]+\/(review|practice)/.test(path)) return null;
  return (
    <footer className="site-footer">
      <nav>
        <Link href="/privacy">{t.footerPrivacy}</Link>
        <Link href="/terms">{t.footerTerms}</Link>
        <Link href="/legal">{t.footerOperator}</Link>
        <Link href="/about#contact">{t.footerContact}</Link>
        <ReportProblemButton className="link-button footer-report" />
      </nav>
      <span>© {new Date().getFullYear()} BlueMemo</span>
    </footer>
  );
}
