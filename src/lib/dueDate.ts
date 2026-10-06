// How card tables show when a card is due: a date (as in the Created column), or, for cards due later
// today (learning steps), "today" with the time. Cards already due say "now".

export const dateLocale = (lang: string) => (lang === "sv" ? "sv-SE" : "en-GB");

export function formatDue(due: Date, now: Date, lang: string, labels: { now: string; today: string }): string {
  if (due.getTime() <= now.getTime()) return labels.now;
  const locale = dateLocale(lang);
  if (due.toDateString() === now.toDateString()) {
    return `${labels.today} ${due.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
  }
  return due.toLocaleDateString(locale);
}
