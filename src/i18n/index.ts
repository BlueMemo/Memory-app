"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/types";
import { en, type Dict } from "./en";
import { sv } from "./sv";

export const dictionaries: Record<Lang, Dict> = { en, sv };
export const languages: Lang[] = ["en", "sv"];

const STORAGE_KEY = "lang";
const listeners = new Set<() => void>();
let chosen: Lang | null = null; // this page view's choice, in case storage is unavailable

// The chosen language lives in the browser; first-time visitors get Swedish if their browser is Swedish.
function readLang(): Lang {
  if (chosen) return chosen;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "sv") return saved;
    return navigator.language.toLowerCase().startsWith("sv") ? "sv" : "en";
  } catch {
    return "en";
  }
}

function subscribe(onChange: () => void) {
  // A change made in another tab wins over this tab's earlier choice.
  const onStorage = () => {
    chosen = null;
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLang(lang: Lang) {
  chosen = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts only for this page view.
  }
  listeners.forEach((fn) => fn());
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return { lang, t: dictionaries[lang], setLang };
}
