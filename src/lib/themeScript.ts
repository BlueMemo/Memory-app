// Kept out of preferences.ts (a client module) so the root layout, a server component, can inline it.

/**
 * v2 since 2026-10-05: v1 saved every field whenever one setting changed, so the old "split" library
 * grouping got stored for many people who never chose it. v2 is v1 without its library grouping
 * (see `migrateV1` in preferences.ts).
 */
export const PREFERENCES_KEY = "prefs.v2";
export const PREFERENCES_KEY_V1 = "prefs.v1";

/**
 * Inline script for <head>: applies the saved appearance before the first paint, so a light-theme
 * user never sees a flash of the dark default. Must stay in step with `applyAppearance` in preferences.ts.
 */
export const THEME_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES_KEY)})||localStorage.getItem(${JSON.stringify(PREFERENCES_KEY_V1)})||"{}"),r=document.documentElement;if(p.theme==="light"||(p.theme==="system"&&matchMedia("(prefers-color-scheme: light)").matches))r.dataset.theme="light";if(p.textSize==="large"||p.textSize==="larger")r.dataset.textSize=p.textSize;if(p.reduceMotion===true)r.dataset.motion="reduce";}catch(e){}})();`;
