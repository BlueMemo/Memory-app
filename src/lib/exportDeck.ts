import type { Deck } from "./types";

// Exporting a deck as a file: tab-separated text (what the importer reads back, and other flashcard apps
// accept) or CSV (for spreadsheets). Columns: question, answer, memory cue, note. A memory route's
// "question" is its stop number, so its stops come out in order.

export type ExportFormat = "txt" | "csv";

const HEADER = ["Fråga", "Svar", "Minnesbild", "Anteckning"];

function rows(deck: Deck): string[][] {
  return deck.cards.map((c, i) => [
    deck.kind === "ordered" ? String(i + 1) : (c.prompt ?? ""),
    c.answer,
    c.visualization ?? c.object ?? "",
    c.note ?? "",
  ]);
}

/** One field in a tab-separated line: tabs and line breaks would break the columns, so they become spaces. */
const tsvField = (s: string) => s.replace(/[\t\r\n]+/g, " ");

/** One CSV field, quoted when it contains a comma, quote or line break (quotes doubled). */
const csvField = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function deckToText(deck: Deck, format: ExportFormat): string {
  const all = [HEADER, ...rows(deck)];
  return format === "csv"
    ? all.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n"
    : all.map((r) => r.map(tsvField).join("\t")).join("\n") + "\n";
}

/** A file name from the deck title: letters, digits and dashes only. */
export function exportFileName(deck: Deck, format: ExportFormat): string {
  const base = deck.title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "deck"}.${format}`;
}

/** Saves the deck as a file in the browser's downloads (UTF-8 with a BOM so spreadsheets read å, ä, ö). */
export function downloadDeck(deck: Deck, format: ExportFormat) {
  const blob = new Blob(["﻿", deckToText(deck, format)], { type: format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(deck, format);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
