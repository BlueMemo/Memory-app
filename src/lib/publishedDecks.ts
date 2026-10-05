"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { Deck, Lang } from "./types";
import { addUserDeck } from "./userDecks";

// Publishing a learner's own deck so others can find it (Discover) or open it from a link, and making
// your own copy of someone else's. Published versions are immutable (see `published_decks` in
// supabase/schema.sql): publishing again adds the next version, and Discover lists the latest.
// ("Shared deck" already means an official deck elsewhere in the code, hence "published".)

export interface PublishedDeck {
  id: string;
  authorId: string;
  author: string | null;
  sourceDeckId: string;
  version: number;
  listed: boolean;
  createdAt: string;
  deck: Deck;
}

export interface SearchFilters {
  query: string;
  language: Lang | "all";
  kind: Deck["kind"] | "all";
}

interface Row {
  id: string;
  author_id: string;
  source_deck_id: string;
  version: number;
  listed: boolean;
  created_at: string;
  deck: Deck;
}

const COLUMNS = "id, author_id, source_deck_id, version, listed, created_at, deck";

/** Lower-cased deck text that search matches against: title, description and the cards' own text. */
export function deckSearchText(deck: Deck): string {
  const parts = [deck.title, deck.description];
  for (const c of deck.cards) parts.push(c.prompt ?? "", c.answer, c.object ?? "", c.visualization ?? "", c.details ?? "");
  return parts.join(" ").replace(/\s+/g, " ").toLowerCase();
}

/** Whether a deck matches a free-text query: every word must appear somewhere in its text. */
export function matchesQuery(text: string, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => text.includes(w));
}

async function usernames(ids: string[]): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || ids.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, username").in("id", [...new Set(ids)]);
  return Object.fromEntries((data ?? []).map((p) => [p.id as string, p.username as string]));
}

const toPublished = (r: Row, names: Record<string, string>): PublishedDeck => ({
  id: r.id,
  authorId: r.author_id,
  author: names[r.author_id] ?? null,
  sourceDeckId: r.source_deck_id,
  version: r.version,
  listed: r.listed,
  createdAt: r.created_at,
  deck: r.deck,
});

/** Search words, minus characters that mean something in LIKE patterns or PostgREST filters. */
const searchWords = (query: string) =>
  query
    .toLowerCase()
    .replace(/[%_\\"(),.*:]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

/** Listed published decks (latest versions) matching the filters; the query also matches author names. */
export async function searchPublishedDecks(filters: SearchFilters, limit = 30): Promise<PublishedDeck[] | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  let request = supabase.from("published_decks_latest").select(COLUMNS).eq("listed", true);
  if (filters.language !== "all") request = request.eq("language", filters.language);
  if (filters.kind !== "all") request = request.eq("kind", filters.kind);

  const words = searchWords(filters.query);
  if (words.length) {
    // Each word must match the deck's text, or the whole query must match an author's username.
    const { data: authors } = await supabase.from("profiles").select("id").ilike("username", `%${words.join(" ")}%`).limit(20);
    const authorIds = (authors ?? []).map((a) => a.id as string);
    const textMatch = `and(${words.map((w) => `search_text.ilike."%${w}%"`).join(",")})`;
    request = request.or(authorIds.length ? `${textMatch},author_id.in.(${authorIds.join(",")})` : textMatch);
  }
  const { data, error } = await request.order("created_at", { ascending: false }).limit(limit);
  if (error) return null; // e.g. the table doesn't exist yet: schema.sql hasn't been re-run
  const rows = data as Row[];
  const names = await usernames(rows.map((r) => r.author_id));
  return rows.map((r) => toPublished(r, names));
}

/** One published version by id, plus the id of a newer version of the same deck if there is one. */
export async function getPublishedDeck(id: string): Promise<{ deck: PublishedDeck; newerId: string | null } | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase.from("published_decks").select(COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as Row;
  const [names, latest] = await Promise.all([
    usernames([row.author_id]),
    supabase
      .from("published_decks_latest")
      .select("id, version")
      .eq("author_id", row.author_id)
      .eq("source_deck_id", row.source_deck_id)
      .maybeSingle(),
  ]);
  const newer = latest.data && (latest.data.version as number) > row.version ? (latest.data.id as string) : null;
  return { deck: toPublished(row, names), newerId: newer };
}

/** Publishes the next version of one of the signed-in learner's own decks. */
export async function publishDeck(deck: Deck, listed: boolean): Promise<PublishedDeck | null> {
  const supabase = getSupabaseBrowserClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return null;
  const { data: latest } = await supabase
    .from("published_decks_latest")
    .select("version")
    .eq("author_id", user.id)
    .eq("source_deck_id", deck.id)
    .maybeSingle();
  const snapshot: Deck = { ...deck, official: false };
  const { data, error } = await supabase
    .from("published_decks")
    .insert({
      author_id: user.id,
      source_deck_id: deck.id,
      version: ((latest?.version as number | undefined) ?? 0) + 1,
      listed,
      title: deck.title,
      description: deck.description,
      language: deck.language,
      kind: deck.kind,
      card_count: deck.cards.length,
      deck: snapshot,
      search_text: deckSearchText(deck),
    })
    .select(COLUMNS)
    .single();
  if (error || !data) return null;
  return toPublished(data as Row, {});
}

/** Removes every published version of one of the signed-in learner's decks. */
export async function unpublishDeck(sourceDeckId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return false;
  const { error } = await supabase.from("published_decks").delete().eq("author_id", user.id).eq("source_deck_id", sourceDeckId);
  return !error;
}

type Publication = { loading: boolean; latest: PublishedDeck | null; available: boolean };

async function loadPublication(sourceDeckId: string, userId: string | null): Promise<Publication> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return { loading: false, latest: null, available: true };
  const { data, error } = await supabase
    .from("published_decks_latest")
    .select(COLUMNS)
    .eq("author_id", userId)
    .eq("source_deck_id", sourceDeckId)
    .maybeSingle();
  return { loading: false, latest: data ? toPublished(data as Row, {}) : null, available: !error };
}

/** The latest published version of one of the signed-in learner's own decks (null if unpublished). */
export function usePublication(sourceDeckId: string, userId: string | null) {
  const [state, setState] = useState<Publication>({ loading: true, latest: null, available: true });
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let live = true;
    void loadPublication(sourceDeckId, userId).then((next) => live && setState(next));
    return () => {
      live = false;
    };
  }, [sourceDeckId, userId, generation]);
  const refresh = useCallback(() => setGeneration((g) => g + 1), []);
  return { ...state, refresh };
}

/** Makes the learner's own editable copy of a published deck; returns the new deck's id. */
export async function copyPublishedDeck(published: PublishedDeck): Promise<string> {
  const id = `user-${crypto.randomUUID()}`;
  await addUserDeck({ ...published.deck, id, official: false });
  return id;
}
