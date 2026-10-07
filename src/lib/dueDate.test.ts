import { describe, expect, it } from "vitest";
import { formatDue } from "./dueDate";

describe("formatDue", () => {
  it("shows only the date, also for later today and for cards already due", () => {
    expect(formatDue(new Date(2026, 9, 7, 14, 35), "sv")).toBe("2026-10-07");
    expect(formatDue(new Date(2026, 9, 1, 8, 0), "sv")).toBe("2026-10-01");
    expect(formatDue(new Date(2026, 9, 12, 9, 0), "en")).toBe("12/10/2026");
  });
});
