import { dayStart } from "./srs/core";

// Study activity shown on the account page: a streak, a calendar heatmap and a recent-activity list,
// all built from review timestamps and test results. Pure (no React, no network) so it can be tested.
// Days use the same 4 am rollover as spaced repetition, so a late-night session counts for "today".

export const HEATMAP_WEEKS = 15;
/** How far back activity is fetched: a little more than the heatmap, which also caps how long a streak can show. */
export const ACTIVITY_WINDOW_DAYS = 120;

const pad = (n: number) => String(n).padStart(2, "0");

/** The study day a moment belongs to, as a local "YYYY-MM-DD" key. */
export function dayKey(d: Date): string {
  const s = dayStart(d);
  return `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Whole days since 1970 for a key, so consecutive days differ by exactly 1 whatever the time zone or DST. */
function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function countByDay(times: Iterable<string | Date>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of times) {
    const key = dayKey(typeof t === "string" ? new Date(t) : t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Consecutive study days ending today. A day without activity yet doesn't break it until the day is over. */
export function currentStreak(counts: Map<string, number>, now: Date): number {
  let cursor = dayStart(now);
  if (!counts.get(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (counts.get(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive study days anywhere in `counts`. */
export function bestStreak(counts: Map<string, number>): number {
  const days = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .map(([key]) => dayNumber(key))
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && day === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  key: string;
  date: Date;
  count: number;
  level: HeatLevel;
  /** Days after today, which fill out the last week's column but shouldn't be drawn. */
  future: boolean;
}

export function heatLevel(count: number): HeatLevel {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 9) return 2;
  if (count <= 24) return 3;
  return 4;
}

/** Weeks as columns of 7 days (Monday first); the last column holds today. */
export function heatmapWeeks(counts: Map<string, number>, now: Date, weeks = HEATMAP_WEEKS): HeatCell[][] {
  const today = dayStart(now);
  const todayRow = (today.getDay() + 6) % 7;
  const first = addDays(today, -((weeks - 1) * 7 + todayRow));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, row) => {
      const date = addDays(first, w * 7 + row);
      const key = dayKey(date);
      const count = counts.get(key) ?? 0;
      return { key, date, count, level: heatLevel(count), future: date > today };
    }),
  );
}

export type ActivityItem =
  | { kind: "test"; at: Date; deckId: string; score: number; total: number }
  | { kind: "review"; at: Date; count: number };

export interface TestResult {
  deckId: string;
  score: number;
  total: number;
  /** ISO timestamp. */
  at: string;
}

/** Tests as they happened, and reviews rolled up into one line per study day, newest first. */
export function recentActivity(tests: TestResult[], reviewTimes: string[], limit = 8): ActivityItem[] {
  const byDay = new Map<string, { count: number; latest: Date }>();
  for (const t of reviewTimes) {
    const at = new Date(t);
    const key = dayKey(at);
    const day = byDay.get(key);
    byDay.set(key, { count: (day?.count ?? 0) + 1, latest: day && day.latest > at ? day.latest : at });
  }
  const items: ActivityItem[] = [
    ...tests.map((r): ActivityItem => ({ kind: "test", at: new Date(r.at), deckId: r.deckId, score: r.score, total: r.total })),
    ...[...byDay.values()].map((d): ActivityItem => ({ kind: "review", at: d.latest, count: d.count })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

/** "3 hours ago", "yesterday", "2 weeks ago" in the site's language. */
export function formatAgo(at: Date, now: Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
  if (minutes < 1) return rtf.format(0, "second");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 14) return rtf.format(-days, "day");
  if (days < 60) return rtf.format(-Math.round(days / 7), "week");
  return rtf.format(-Math.round(days / 30), "month");
}
