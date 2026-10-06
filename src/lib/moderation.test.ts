import { describe, expect, it } from "vitest";
import { cleanNote, MAX_NOTE_LENGTH, REPORT_REASONS } from "./moderation";

describe("cleanNote", () => {
  it("trims whitespace", () => {
    expect(cleanNote("  hello \n")).toBe("hello");
  });

  it("cuts a note to the length the database accepts", () => {
    expect(cleanNote("x".repeat(MAX_NOTE_LENGTH + 50))).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("keeps an empty note empty", () => {
    expect(cleanNote("   ")).toBe("");
  });
});

describe("REPORT_REASONS", () => {
  it("matches the reasons the database allows", () => {
    expect([...REPORT_REASONS]).toEqual(["illegal", "copyright", "abusive", "adult", "spam", "other"]);
  });
});
