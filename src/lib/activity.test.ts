import { describe, expect, it } from "vitest";
import { bestStreak, countByDay, currentStreak, dayKey, formatAgo, heatLevel, heatmapWeeks, recentActivity } from "./activity";

// Local times throughout, because study days are local. 2026-10-04 is a Sunday.
const at = (month: number, day: number, hour = 12, minute = 0) => new Date(2026, month - 1, day, hour, minute);

describe("dayKey", () => {
  it("counts the small hours as the previous study day", () => {
    expect(dayKey(at(10, 4, 3, 30))).toBe("2026-10-03");
    expect(dayKey(at(10, 4, 4, 0))).toBe("2026-10-04");
    expect(dayKey(at(10, 4, 23, 59))).toBe("2026-10-04");
  });
});

describe("streaks", () => {
  it("counts consecutive days ending today", () => {
    const counts = countByDay([at(10, 2), at(10, 3), at(10, 4)]);
    expect(currentStreak(counts, at(10, 4, 18))).toBe(3);
  });

  it("keeps yesterday's streak alive until today is over", () => {
    const counts = countByDay([at(10, 2), at(10, 3)]);
    expect(currentStreak(counts, at(10, 4, 9))).toBe(2);
  });

  it("is zero after a missed day", () => {
    const counts = countByDay([at(10, 1), at(10, 2)]);
    expect(currentStreak(counts, at(10, 4, 9))).toBe(0);
  });

  it("finds the longest run anywhere", () => {
    const counts = countByDay([at(9, 1), at(9, 2), at(9, 3), at(9, 4), at(9, 10), at(9, 11), at(10, 4)]);
    expect(bestStreak(counts)).toBe(4);
    expect(bestStreak(new Map())).toBe(0);
  });

  it("treats repeated activity on one day as one day", () => {
    const counts = countByDay([at(10, 3, 9), at(10, 3, 10), at(10, 3, 22)]);
    expect(counts.get("2026-10-03")).toBe(3);
    expect(currentStreak(counts, at(10, 3, 23))).toBe(1);
  });
});

describe("heatmapWeeks", () => {
  it("lays out weeks as Monday-first columns ending with today", () => {
    const weeks = heatmapWeeks(new Map(), at(10, 4, 12), 15);
    expect(weeks).toHaveLength(15);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // A Sunday is the last row of its week, so the final column has no future days.
    expect(weeks[14][6].key).toBe("2026-10-04");
    expect(weeks[14].some((c) => c.future)).toBe(false);
  });

  it("marks the rest of the current week as future", () => {
    const weeks = heatmapWeeks(new Map(), at(10, 7, 12), 15); // a Wednesday
    expect(weeks[14].map((c) => c.future)).toEqual([false, false, false, true, true, true, true]);
    expect(weeks[14][2].key).toBe("2026-10-07");
  });

  it("carries counts and levels onto cells", () => {
    const counts = countByDay([at(10, 4), at(10, 4), at(10, 4)]);
    const today = heatmapWeeks(counts, at(10, 4, 12), 15)[14][6];
    expect(today.count).toBe(3);
    expect(today.level).toBe(2);
  });

  it("buckets counts into five levels", () => {
    expect([0, 1, 2, 3, 9, 10, 24, 25, 500].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("recentActivity", () => {
  it("rolls reviews up per day and interleaves tests, newest first", () => {
    const reviews = [at(10, 3, 9), at(10, 3, 9, 30), at(10, 3, 10), at(10, 1, 8)].map((d) => d.toISOString());
    const tests = [{ deckId: "d", score: 8, total: 10, at: at(10, 3, 11).toISOString() }];
    const items = recentActivity(tests, reviews);
    expect(items.map((i) => i.kind)).toEqual(["test", "review", "review"]);
    expect(items[1]).toMatchObject({ kind: "review", count: 3 });
    expect(items[2]).toMatchObject({ kind: "review", count: 1 });
  });

  it("respects the limit", () => {
    const reviews = [1, 2, 3, 4, 5].map((d) => at(9, d).toISOString());
    expect(recentActivity([], reviews, 3)).toHaveLength(3);
  });
});

describe("formatAgo", () => {
  const now = at(10, 4, 12);
  it("describes recent and older moments", () => {
    expect(formatAgo(new Date(now.getTime() - 30_000), now, "en")).toBe("now");
    expect(formatAgo(new Date(now.getTime() - 5 * 60_000), now, "en")).toBe("5 minutes ago");
    expect(formatAgo(new Date(now.getTime() - 3 * 3_600_000), now, "en")).toBe("3 hours ago");
    expect(formatAgo(at(10, 3, 12), now, "en")).toBe("yesterday");
    expect(formatAgo(at(9, 20, 12), now, "en")).toBe("2 weeks ago");
  });
});
