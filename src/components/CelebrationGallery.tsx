"use client";

import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n";
import { CELEBRATIONS, rarityOf } from "@/lib/celebrations";
import { Celebration } from "./Celebration";

/** /celebrations: every celebration, to try them out (not linked from the site). */
export function CelebrationGallery() {
  const { lang, t } = useI18n();
  const c = t.celebrations;
  const [shown, setShown] = useState({ id: CELEBRATIONS[0].id, run: 0 });
  // Particles are random, so draw them only in the browser (server and browser would disagree).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return (
    <main className="page narrow">
      <section className="page-intro">
        <h1>{c.previewTitle}</h1>
        <p>{c.previewLead}</p>
      </section>
      <div className="celebration-stage">
        {/* A new key replays the animation each time a button is pressed. */}
        {mounted && <Celebration key={`${shown.id}-${shown.run}`} id={shown.id} />}
      </div>
      <div className="celebration-picker">
        {CELEBRATIONS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`btn ${shown.id === v.id ? "accent" : "nav"}`}
            onClick={() => setShown((s) => ({ id: v.id, run: s.run + 1 }))}
          >
            {c.items[v.id as keyof typeof c.items].title} · {v.weight.toLocaleString(lang === "sv" ? "sv-SE" : "en-GB")} % · {c.rarity[rarityOf(v.weight)]}
          </button>
        ))}
      </div>
    </main>
  );
}
