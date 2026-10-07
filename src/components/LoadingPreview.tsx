"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { LoadingScreen, type LoadingVariant } from "./LoadingScreen";

const VARIANTS: LoadingVariant[] = ["night", "doorway", "constellation"];

/** /loading-preview: the loading screen designs side by side, each also viewable full screen. */
export function LoadingPreview() {
  const t = useI18n().t.loading;
  const [full, setFull] = useState<LoadingVariant | null>(null);

  if (full) {
    return (
      <div onClick={() => setFull(null)} title={t.previewClose}>
        <LoadingScreen variant={full} />
      </div>
    );
  }

  return (
    <main className="page wide">
      <section className="page-intro">
        <h1>{t.previewTitle}</h1>
        <p>{t.previewLead}</p>
      </section>
      <ul className="loading-gallery">
        {VARIANTS.map((v, i) => (
          <li key={v}>
            <div className="loading-frame">
              <LoadingScreen variant={v} fullScreen={false} />
            </div>
            <h2>
              {String.fromCharCode(65 + i)}. {t.variants[v].name}
            </h2>
            <p className="muted">{t.variants[v].description}</p>
            <button className="btn nav" onClick={() => setFull(v)}>
              {t.previewFull}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
