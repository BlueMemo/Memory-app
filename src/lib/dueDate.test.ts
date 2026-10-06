import { describe, expect, it } from "vitest";
import { formatDue } from "./dueDate";

const labels = { now: "now", today: "today" };
const now = new Date(2026, 9, 7, 12, 0);

describe("formatDue", () => {
  it("says now for cards already due", () => {
    expect(formatDue(new Date(2026, 9, 1), now, "en", labels)).toBe("now");
    expect(formatDue(now, now, "en", labels)).toBe("now");
  });

  it("shows the time for cards due later today", () => {
    expect(formatDue(new Date(2026, 9, 7, 14, 35), now, "sv", labels)).toBe("today 14:35");
  });

  it("shows the date for later days", () => {
    expect(formatDue(new Date(2026, 9, 12, 9, 0), now, "sv", labels)).toBe("2026-10-12");
    expect(formatDue(new Date(2026, 9, 12, 9, 0), now, "en", labels)).toBe("12/10/2026");
  });
});
