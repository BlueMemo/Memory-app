"use client";

import { useCallback, useEffect, useState } from "react";
import { PRESET_OPTION_KEYS, type PresetOptions, type SrsSettings } from "./srs/core";
import { updateSrsSettings, useSrsData } from "./srs/store";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { Deck, Lang } from "./types";
import { addUserDeck } from "./userDecks";

// Publishing a learner's own deck so others can find it (Discover) or open it from a link, and making
// your own copy of someone else's. Published versions are immutable (see `published_decks` in
// supabase/schema.sql): publishing again adds the next version, and Discover lists the latest.
// ("Shared deck" already means an official deck elsewhere in the code, hence "published".)

/** The author's settings for a deck that can travel with it: its preset's FSRS options and new cards a day. */
export type PublishedDeckSettings = Partial<PresetOptions> & { newPerDay?: number };

/**
 * A published deck without its cards: everything a list tile or the share panel needs. Cards can hold images
 * (as data URLs), so lists must not download them: a search for 30 decks would otherwise fetch 30 whole decks.
 */
export interface PublishedSummary {
  id: string;
  authorId: string;
  author: string | null;
  /** The author's profile photo, if they chose to show it when publishing. */
  avatarUrl: string | null;
  showAvatar: boolean;
  sourceDeckId: string;
  version: number;
  listed: boolean;
  createdAt: string;
  /** The author's own settings for the deck that a copy starts with (null: the learner's defaults). */
  deckSettings: PublishedDeckSettings | null;
  /** Copies of all versions together, for "Most popular". */
  copies: number;
  /** Published by a moderator as an official BlueMemo deck (shown under Official decks, as made by BlueMemo). */
  official: boolean;
  /** A moderator hid it: only its author and moderators can still open it. */
  hidden: boolean;
  /** Why it was hidden, as written by the moderator. */
  hiddenReason: string | null;
  title: string;
  description: string;
  kind: Deck["kind"];
  language: Lang;
  cardCount: number;
}

/** A published deck with its cards, for the page that opens it and for making a copy. */
export interface PublishedDeck extends PublishedSummary {
  deck: Deck;
}

/** "official" / "community" pick where decks come from; "ordered" / "unordered" pick their kind. */
export type DeckTypeFilter = "all" | "official" | "community" | Deck["kind"];
export type DeckSort = "popular" | "az" | "za" | "oldest" | "newest";

export interface SearchFilters {
  query: string;
  language: Lang | "all";
  type: DeckTypeFilter;
  sort: DeckSort;
}

export interface PublishOptions {
  /** List it in Discover (false: only people with the link can open it). */
  listed: boolean;
  showAvatar: boolean;
  /** Include the author's settings for the deck (its preset's FSRS options and new cards a day). */
  includeSettings: boolean;
  /** Moderators only: publish it as an official BlueMemo deck (always listed). */
  official: boolean;
}

interface Row {
  id: string;
  author_id: string;
  source_deck_id: string;
  version: number;
  listed: boolean;
  created_at: string;
  show_avatar?: boolean | null;
  deck_settings?: PublishedDeckSettings | null;
  copy_count?: number | null;
  total_copies?: number | null;
  hidden?: boolean | null;
  hidden_reason?: string | null;
  official?: boolean | null;
  title: string;
  description: string | null;
  language: Lang;
  kind: Deck["kind"];
  card_count: number | null;
  /** Not selected by list queries. */
  deck?: Deck;
}

const COLUMNS = "id, author_id, source_deck_id, version, listed, created_at, show_avatar, deck_settings, copy_count, hidden, hidden_reason, official, deck";
/**
 * The columns from before publish options and popularity existed. Used as a fallback while a database
 * hasn't been updated with the latest schema.sql yet, so sharing keeps working (without those extras).
 */
const LEGACY_COLUMNS = "id, author_id, source_deck_id, version, listed, created_at, deck";

/** The same columns without the cards (`deck`), plus the few deck fields that used to be read from it. The latest-version view also has the popularity across versions (`total_copies`). */
const SUMMARY_COLUMNS =
  "id, author_id, source_deck_id, version, listed, created_at, show_avatar, deck_settings, copy_count, hidden, hidden_reason, official, title, description, language, kind, card_count";
const LATEST_SUMMARY_COLUMNS = `${SUMMARY_COLUMNS}, total_copies`;
const LEGACY_SUMMARY_COLUMNS = "id, author_id, source_deck_id, version, listed, created_at, title, description, language, kind, card_count";

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

type Authors = Record<string, { username: string; avatarUrl: string | null }>;

async function authors(ids: string[]): Promise<Authors> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || ids.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", [...new Set(ids)]);
  return Object.fromEntries(
    (data ?? []).map((p) => [p.id as string, { username: p.username as string, avatarUrl: (p.avatar_url as string | null) ?? null }]),
  );
}

/** A row as a summary. Exported for tests. */
export const toSummary = (r: Row, people: Authors): PublishedSummary => ({
  id: r.id,
  authorId: r.author_id,
  author: people[r.author_id]?.username ?? null,
  avatarUrl: r.show_avatar === false || r.official === true ? null : (people[r.author_id]?.avatarUrl ?? null),
  showAvatar: r.show_avatar !== false,
  sourceDeckId: r.source_deck_id,
  version: r.version,
  listed: r.listed,
  createdAt: r.created_at,
  deckSettings: r.deck_settings ?? null,
  copies: r.total_copies ?? r.copy_count ?? 0,
  official: r.official === true,
  hidden: r.hidden === true,
  hiddenReason: r.hidden_reason ?? null,
  title: r.title,
  description: r.description ?? "",
  kind: r.kind,
  language: r.language,
  cardCount: r.card_count ?? r.deck?.cards.length ?? 0,
});

const toPublished = (r: Row, people: Authors): PublishedDeck => ({ ...toSummary(r, people), deck: r.deck as Deck });

/** Search words, minus characters that mean something in LIKE patterns or PostgREST filters. */
const searchWords = (query: string) =>
  query
    .toLowerCase()
    .replace(/[%_\\"(),.*:]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

/** Listed published decks (latest versions) matching the filters; the query also matches author names. */
export async function searchPublishedDecks(filters: SearchFilters, limit = 30): Promise<PublishedSummary[] | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const words = searchWords(filters.query);
  let authorIds: string[] = [];
  if (words.length) {
    const { data: authors } = await supabase.from("profiles").select("id").ilike("username", `%${words.join(" ")}%`).limit(20);
    authorIds = (authors ?? []).map((a) => a.id as string);
  }

  const run = (columns: string, withPopularity: boolean) => {
    let request = supabase.from("published_decks_latest").select(columns).eq("listed", true);
    // The official flag only exists once schema.sql has it (the fallback run below doesn't filter on it).
    if (withPopularity && filters.type === "official") request = request.eq("official", true);
    if (withPopularity && filters.type === "community") request = request.eq("official", false);
    if (filters.language !== "all") request = request.eq("language", filters.language);
    if (filters.type === "ordered" || filters.type === "unordered") request = request.eq("kind", filters.type);
    if (words.length) {
      // Each word must match the deck's text, or the whole query must match an author's username.
      const textMatch = `and(${words.map((w) => `search_text.ilike."%${w}%"`).join(",")})`;
      request = request.or(authorIds.length ? `${textMatch},author_id.in.(${authorIds.join(",")})` : textMatch);
    }
    request =
      filters.sort === "popular" && withPopularity
        ? request.order("total_copies", { ascending: false }).order("created_at", { ascending: false })
        : filters.sort === "az" || filters.sort === "za"
          ? request.order("title", { ascending: filters.sort === "az" })
          : request.order("created_at", { ascending: filters.sort === "oldest" });
    return request.limit(limit);
  };
  let { data, error } = await run(LATEST_SUMMARY_COLUMNS, true);
  const fullSchema = !error;
  if (error) ({ data, error } = await run(LEGACY_SUMMARY_COLUMNS, false));
  if (error) return null; // e.g. the table doesn't exist yet: schema.sql hasn't been run
  if (filters.type === "official" && !fullSchema) return []; // no official decks before the column exists
  // Hidden decks can still be read by their author; they don't belong in anyone's Discover.
  const rows = (data as unknown as Row[]).filter((r) => r.hidden !== true);
  const people = await authors(rows.map((r) => r.author_id));
  return rows.map((r) => toSummary(r, people));
}

/** One published version by id, plus the id of a newer version of the same deck if there is one. */
export async function getPublishedDeck(id: string): Promise<{ deck: PublishedDeck; newerId: string | null } | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  let { data } = await supabase.from("published_decks").select(COLUMNS).eq("id", id).maybeSingle();
  if (!data) ({ data } = await supabase.from("published_decks").select(LEGACY_COLUMNS).eq("id", id).maybeSingle());
  if (!data) return null;
  const row = data as Row;
  const [people, latest] = await Promise.all([
    authors([row.author_id]),
    supabase
      .from("published_decks_latest")
      .select("id, version")
      .eq("author_id", row.author_id)
      .eq("source_deck_id", row.source_deck_id)
      .maybeSingle(),
  ]);
  const newer = latest.data && (latest.data.version as number) > row.version ? (latest.data.id as string) : null;
  return { deck: toPublished(row, people), newerId: newer };
}

/**
 * Publishes the next version of one of the signed-in learner's own decks. `settings` are the author's
 * own options for the deck, included when `options.includeSettings` is on (an exam date is personal and
 * never published).
 */
export async function publishDeck(deck: Deck, options: PublishOptions, settings?: PublishedDeckSettings): Promise<PublishedDeck | null> {
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
  const insert = (row: Record<string, unknown>, columns: string) => supabase.from("published_decks").insert(row).select(columns).single();
  const row: Record<string, unknown> = {
    author_id: user.id,
    source_deck_id: deck.id,
    version: ((latest?.version as number | undefined) ?? 0) + 1,
    listed: options.listed,
    show_avatar: options.showAvatar,
    deck_settings: options.includeSettings && settings ? settings : null,
    title: deck.title,
    description: deck.description,
    language: deck.language,
    kind: deck.kind,
    card_count: deck.cards.length,
    deck: snapshot,
    search_text: deckSearchText(deck),
  };
  // Only sent when on: databases from before the column simply don't get it. Official decks are always listed.
  if (options.official) {
    row.official = true;
    row.listed = true;
  }
  let { data, error } = await insert(row, COLUMNS);
  if (error && options.official) return null; // never quietly publish an "official" deck as an ordinary one
  if (error) {
    // An older database without the publish-option columns: publish without them.
    const legacy = { ...row };
    delete legacy.show_avatar;
    delete legacy.deck_settings;
    ({ data, error } = await insert(legacy, LEGACY_COLUMNS));
  }
  if (error || !data) return null;
  return toPublished(data as unknown as Row, {});
}

/** Removes every published version of one of the signed-in learner's decks. */
export async function unpublishDeck(sourceDeckId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return false;
  const { error } = await supabase.from("published_decks").delete().eq("author_id", user.id).eq("source_deck_id", sourceDeckId);
  return !error;
}

/** JSON with sorted keys (the database's jsonb doesn't keep key order), for comparing deck content. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}

const contentOf = (deck: Deck) => stableJson({ title: deck.title, description: deck.description ?? "", kind: deck.kind, language: deck.language, cards: deck.cards });

/** Whether the learner's deck has changed since this version was published (title, description, kind, language or cards). */
export const hasUnpublishedChanges = (deck: Deck, published: PublishedDeck) => contentOf(deck) !== contentOf(published.deck);

/** The latest version, with cards, of every deck the signed-in learner has published (null: not available). */
export async function myPublishedDecks(): Promise<PublishedDeck[] | null> {
  const supabase = getSupabaseBrowserClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return null;
  const query = (columns: string) => supabase.from("published_decks_latest").select(columns).eq("author_id", user.id).order("created_at", { ascending: false });
  let { data, error } = await query(`${COLUMNS}, total_copies`);
  if (error) ({ data, error } = await query(LEGACY_COLUMNS));
  if (error || !data) return null;
  return (data as unknown as Row[]).map((r) => toPublished(r, {}));
}

/** Publishes the deck's current content as the next version, with the same options (and settings) as the latest one. */
export const publishUpdate = (deck: Deck, latest: PublishedSummary) =>
  publishDeck(
    deck,
    { listed: latest.listed, showAvatar: latest.showAvatar, includeSettings: latest.deckSettings !== null, official: latest.official },
    latest.deckSettings ?? undefined,
  );

type Publication = { loading: boolean; latest: PublishedSummary | null; available: boolean };

async function loadPublication(sourceDeckId: string, userId: string | null): Promise<Publication> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return { loading: false, latest: null, available: true };
  const query = (columns: string) =>
    supabase.from("published_decks_latest").select(columns).eq("author_id", userId).eq("source_deck_id", sourceDeckId).maybeSingle();
  let { data, error } = await query(LATEST_SUMMARY_COLUMNS);
  if (error) ({ data, error } = await query(LEGACY_SUMMARY_COLUMNS));
  return { loading: false, latest: data ? toSummary(data as unknown as Row, {}) : null, available: !error };
}

/** The latest published version (without its cards) of one of the signed-in learner's own decks (null if unpublished). */
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

/**
 * Makes the learner's own editable copy of a published deck; returns the new deck's id. If the author
 * included their settings, the copy gets a preset of its own with them (named after the deck). Signed in,
 * the copy also counts towards the deck's popularity. `settings` are the learner's current SRS settings.
 */
export async function copyPublishedDeck(published: PublishedDeck, settings: SrsSettings): Promise<string> {
  if (published.hidden) throw new Error("This deck was removed by a moderator.");
  const id = `user-${crypto.randomUUID()}`;
  await addUserDeck({ ...published.deck, id, official: false });
  const shared = published.deckSettings;
  if (shared) {
    const own: SrsSettings["deckOverrides"][string] = {};
    let presets = settings.presets;
    if (PRESET_OPTION_KEYS.some((k) => shared[k] !== undefined)) {
      const presetId = `copy-${id}`;
      presets = [...presets, { ...presets[0], ...pickPresetOptions(shared), id: presetId, name: published.deck.title.slice(0, 60) }];
      own.presetId = presetId;
    }
    if (typeof shared.newPerDay === "number") own.newPerDay = shared.newPerDay;
    await updateSrsSettings({ presets, deckOverrides: { ...settings.deckOverrides, [id]: own } });
  }
  const supabase = getSupabaseBrowserClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (supabase && user) {
    // One count per learner and version; a repeat copy is simply ignored.
    await supabase.from("published_deck_copies").upsert({ published_id: published.id, user_id: user.id }, { ignoreDuplicates: true });
  }
  return id;
}

const pickPresetOptions = (s: PublishedDeckSettings): Partial<PresetOptions> =>
  Object.fromEntries(PRESET_OPTION_KEYS.filter((k) => s[k] !== undefined).map((k) => [k, s[k]]));

/** The learner's SRS settings, for passing to copyPublishedDeck. */
export const useSettingsForCopy = () => useSrsData().settings;
