"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { CONTACT_EMAIL } from "./AboutView";
import { PageTabs } from "./PageTabs";

export type LegalDoc = "privacy" | "terms" | "operator";

/**
 * Legal text with a little markup: **bold**, [label](/path) links and {email} for the contact address.
 * Used by the legal pages, the sign-up form and the share panel.
 */
export function renderLegal(text: string): ReactNode {
  return text.split(/(\[[^\]]+\]\([^)]+\)|\{email\}|\*\*[^*]+\*\*)/).map((part, i) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <Link key={i} href={link[2]}>{link[1]}</Link>;
    if (part === "{email}") return <a key={i} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** The privacy policy, terms of use and "who runs BlueMemo" pages: texts live in i18n `legal`. */
export function LegalView({ doc }: { doc: LegalDoc }) {
  const { t } = useI18n();
  const page = t.legal[doc];
  return (
    <main className="page narrow legal-page">
      <section className="page-intro">
        <h1>{page.title}</h1>
        <p>{page.lead}</p>
        <p className="fine-print">{fill(t.legal.updated, { date: t.legal.updatedDate })}</p>
      </section>

      {page.sections.length > 4 && <PageTabs label={page.title} tabs={page.sections.map((s) => ({ id: s.id, title: s.title }))} />}

      {page.sections.map((s) => (
        <section key={s.id} id={s.id} className="about-section">
          <h2>{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i}>{renderLegal(p)}</p>
          ))}
          {s.list.length > 0 && (
            <ul>
              {s.list.map((item, i) => (
                <li key={i}>{renderLegal(item)}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
