import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from "@/lib/supabase/config";
import type { Deck } from "@/lib/types";

// Server-side lookup of a published deck for its link preview. Uses a plain anonymous client (no
// cookies): published decks and usernames are public anyway, and previews are fetched by the apps'
// crawlers, which are never signed in.

export interface PublishedDeckSummary {
  title: string;
  description: string;
  cardCount: number;
  author: string | null;
}

export async function getPublishedDeckSummary(id: string): Promise<PublishedDeckSummary | null> {
  if (!supabaseConfigured || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, { auth: { persistSession: false } });
  const { data } = await supabase.from("published_decks").select("author_id, deck").eq("id", id).maybeSingle();
  if (!data) return null;
  const deck = data.deck as Deck;
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", data.author_id).maybeSingle();
  return {
    title: deck.title,
    description: deck.description ?? "",
    cardCount: deck.cards.length,
    author: (profile?.username as string | undefined) ?? null,
  };
}
