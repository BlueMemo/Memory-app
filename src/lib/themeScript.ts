// Kept out of preferences.ts (a client module) so the root layout, a server component, can inline it.

export const PREFERENCES_KEY = "prefs.v1";

/**
 * Inline script for <head>: applies the saved appearance before the first paint, so a light-theme
 * user never sees a flash of the dark default. Must stay in step with `applyAppearance` in preferences.ts.
 */
export const THEME_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFERENCES_KEY)})||"{}"),r=document.documentElement;if(p.theme==="light"||(p.theme==="system"&&matchMedia("(prefers-color-scheme: light)").matches))r.dataset.theme="light";if(p.textSize==="large"||p.textSize==="larger")r.dataset.textSize=p.textSize;if(p.reduceMotion===true)r.dataset.motion="reduce";}catch(e){}})();`;
