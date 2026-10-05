"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A row of tabs that jumps to the sections of a long page, stays at the top while scrolling, and marks
 * the section being read. Each tab's `id` must match an element's `id` (a section or its heading); tabs
 * whose element isn't on the page (e.g. a section that only shows when there's something in it) are hidden.
 */
export function PageTabs({ tabs, label }: { tabs: { id: string; title: string }[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [present, setPresent] = useState<string[] | null>(null);
  const nav = useRef<HTMLElement>(null);
  const ids = tabs.map((t) => t.id).join(",");

  // On phones the tabs scroll sideways: keep the active one in view.
  useEffect(() => {
    const link = active ? nav.current?.querySelector<HTMLElement>(`a[href="#${active}"]`) : null;
    if (!link || !nav.current) return;
    const { offsetLeft, offsetWidth } = link;
    const { scrollLeft, clientWidth } = nav.current;
    if (offsetLeft < scrollLeft || offsetLeft + offsetWidth > scrollLeft + clientWidth) {
      const still = document.documentElement.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;
      nav.current.scrollTo({ left: offsetLeft - 16, behavior: still ? "auto" : "smooth" });
    }
  }, [active]);

  useEffect(() => {
    const find = () =>
      ids
        .split(",")
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
    const sections = find();
    // A section counts as "being read" once its top passes the upper part of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    // Sections can appear or disappear after loading (e.g. account statistics): keep the tabs in step.
    const update = () => setPresent(find().map((el) => el.id));
    update();
    const mutations = new MutationObserver(() => {
      const now = find();
      now.forEach((el) => observer.observe(el));
      update();
    });
    mutations.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [ids]);

  const shown = present ? tabs.filter((t) => present.includes(t.id)) : tabs;
  if (shown.length < 2) return null;

  return (
    <nav ref={nav} className="page-tabs" aria-label={label}>
      {shown.map((tab) => (
        <a key={tab.id} href={`#${tab.id}`} className={active === tab.id ? "active" : undefined} aria-current={active === tab.id ? "location" : undefined}>
          {tab.title}
        </a>
      ))}
    </nav>
  );
}
