import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, parsePreferences } from "./preferences";

describe("preferences", () => {
  it("defaults to the dark theme", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES.theme).toBe("dark");
  });

  it("keeps valid saved values and replaces unknown ones", () => {
    const p = parsePreferences(JSON.stringify({ theme: "light", textSize: "huge", reduceMotion: "yes" }));
    expect(p.theme).toBe("light");
    expect(p.textSize).toBe("normal");
    expect(p.reduceMotion).toBe(false);
  });

  it("survives unreadable storage", () => {
    expect(parsePreferences("{not json")).toEqual(DEFAULT_PREFERENCES);
  });
});
