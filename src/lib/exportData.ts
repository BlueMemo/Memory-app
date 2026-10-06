import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Supabase returns at most 1000 rows per request. */
export const EXPORT_PAGE = 1000;

type Page = { data: Record<string, unknown>[] | null; error: { message: string } | null };

/** Collects every row by asking for consecutive pages until one comes back short. Pure, so it's tested. */
export async function fetchAllPages(fetchPage: (from: number, to: number) => PromiseLike<Page>, pageSize = EXPORT_PAGE): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

/** Every table that holds something belonging to the learner: which column says whose it is, and a unique
 *  ordering so paging never skips or repeats a row. */
export const EXPORT_TABLES: { table: string; owner: string; order: string[] }[] = [
  { table: "profiles", owner: "id", order: ["id"] },
  { table: "decks", owner: "user_id", order: ["id"] },
  { table: "saved_decks", owner: "user_id", order: ["deck_id"] },
  { table: "deck_overrides", owner: "user_id", order: ["deck_id"] },
  { table: "user_settings", owner: "user_id", order: ["user_id"] },
  { table: "srs_deck_settings", owner: "user_id", order: ["deck_id"] },
  { table: "srs_cards", owner: "user_id", order: ["deck_id", "card_id"] },
  { table: "srs_review_logs", owner: "user_id", order: ["id"] },
  { table: "practice_results", owner: "user_id", order: ["id"] },
  { table: "published_decks", owner: "author_id", order: ["id"] },
  { table: "published_deck_copies", owner: "user_id", order: ["published_id"] },
  { table: "problem_reports", owner: "user_id", order: ["id"] },
];

export interface AccountExport {
  app: "BlueMemo";
  exportedAt: string;
  account: { id: string; email: string | null; createdAt: string };
  /** Row counts per table, so it's easy to see nothing is missing. */
  counts: Record<string, number>;
  data: Record<string, Record<string, unknown>[]>;
}

/** Downloads everything the signed-in learner owns. Throws if any table can't be read, because an export
 *  that silently leaves something out is worse than none. */
export async function exportAccountData(supabase: SupabaseClient, user: User): Promise<AccountExport> {
  const data: AccountExport["data"] = {};
  for (const { table, owner, order } of EXPORT_TABLES) {
    try {
      data[table] = await fetchAllPages((from, to) => {
        let q = supabase.from(table).select("*").eq(owner, user.id);
        for (const col of order) q = q.order(col);
        return q.range(from, to);
      });
    } catch (e) {
      throw new Error(`${table}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  return {
    app: "BlueMemo",
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null, createdAt: user.created_at },
    counts: Object.fromEntries(Object.entries(data).map(([t, rows]) => [t, rows.length])),
    data,
  };
}

export function exportFileName(date = new Date()): string {
  return `bluememo-data-${date.toISOString().slice(0, 10)}.json`;
}
