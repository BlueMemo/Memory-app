// How card tables show when a card is due: just the date, in the same format as the Created column (no
// "today 14:35", no "now"; a date in the past means the card is waiting).

export const dateLocale = (lang: string) => (lang === "sv" ? "sv-SE" : "en-GB");

export function formatDue(due: Date, lang: string): string {
  return due.toLocaleDateString(dateLocale(lang));
}
