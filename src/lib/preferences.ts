"use client";

import { useSyncExternalStore } from "react";
import { PREFERENCES_KEY as KEY } from "./themeScript";

// General preferences (appearance and how the library is laid out). They're per device on purpose, like
// most sites' theme settings, so they live in browser storage for guests and signed-in users alike.
// Appearance is applied as attributes on <html>; THEME_SCRIPT (themeScript.ts) applies it before the page paints.

export type Theme = "dark" | "light" | "system";
export type TextSize = "normal" | "large" | "larger";
export type LibraryView = "grid" | "rows" | "list";
export type LibrarySort = "recent" | "practised" | "due" | "name";
export type LibraryGroup = "split" | "all" | "kind";

export interface Preferences {
  theme: Theme;
  textSize: TextSize;
  reduceMotion: boolean;
  libraryView: LibraryView;
  librarySort: LibrarySort;
  libraryGroup: LibraryGroup;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  textSize: "normal",
  reduceMotion: false,
  libraryView: "grid",
  librarySort: "recent",
  libraryGroup: "split",
};

const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;

export function parsePreferences(raw: string | null): Preferences {
  let v: Partial<Record<keyof Preferences, unknown>> = {};
  try {
    v = raw ? JSON.parse(raw) : {};
  } catch {
    // Unreadable: fall back to the defaults.
  }
  const d = DEFAULT_PREFERENCES;
  return {
    theme: pick(v.theme, ["dark", "light", "system"], d.theme),
    textSize: pick(v.textSize, ["normal", "large", "larger"], d.textSize),
    reduceMotion: typeof v.reduceMotion === "boolean" ? v.reduceMotion : d.reduceMotion,
    libraryView: pick(v.libraryView, ["grid", "rows", "list"], d.libraryView),
    librarySort: pick(v.librarySort, ["recent", "practised", "due", "name"], d.librarySort),
    libraryGroup: pick(v.libraryGroup, ["split", "all", "kind"], d.libraryGroup),
  };
}

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached = DEFAULT_PREFERENCES;

function read(): Preferences {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: defaults.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parsePreferences(raw);
  }
  return cached;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFERENCES);
}

export function setPreferences(patch: Partial<Preferences>) {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Can't save: still apply for this visit.
    cachedRaw = undefined;
    cached = next;
  }
  applyAppearance(next);
  listeners.forEach((fn) => fn());
}

const prefersLight = () => window.matchMedia("(prefers-color-scheme: light)").matches;

/** Sets data-theme / data-text-size / data-motion on <html>; "system" follows the device's setting. */
export function applyAppearance(p: Preferences) {
  const root = document.documentElement;
  const light = p.theme === "light" || (p.theme === "system" && prefersLight());
  if (light) root.dataset.theme = "light";
  else delete root.dataset.theme;
  if (p.textSize === "normal") delete root.dataset.textSize;
  else root.dataset.textSize = p.textSize;
  if (p.reduceMotion) root.dataset.motion = "reduce";
  else delete root.dataset.motion;
}

/** Keeps a "Match device" theme in step when the device switches between light and dark. */
export function watchSystemTheme(): () => void {
  const query = window.matchMedia("(prefers-color-scheme: light)");
  const onChange = () => applyAppearance(read());
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
