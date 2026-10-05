import { describe, expect, it } from "vitest";
import { exportFileName, fetchAllPages } from "./exportData";

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ i }));
const pager = (all: Record<string, unknown>[]) => async (from: number, to: number) => ({ data: all.slice(from, to + 1), error: null });

describe("fetchAllPages", () => {
  it("returns nothing for an empty table", async () => {
    expect(await fetchAllPages(pager([]), 3)).toEqual([]);
  });

  it("collects every row across pages, including when the last page is full", async () => {
    expect(await fetchAllPages(pager(rows(7)), 3)).toHaveLength(7);
    expect(await fetchAllPages(pager(rows(6)), 3)).toHaveLength(6);
  });

  it("keeps the rows in order", async () => {
    const out = await fetchAllPages(pager(rows(5)), 2);
    expect(out.map((r) => r.i)).toEqual([0, 1, 2, 3, 4]);
  });

  it("fails loudly instead of returning a partial export", async () => {
    const failing = async (from: number) => (from === 0 ? { data: rows(3), error: null } : { data: null, error: { message: "boom" } });
    await expect(fetchAllPages(failing, 3)).rejects.toThrow("boom");
  });
});

describe("exportFileName", () => {
  it("includes the date", () => {
    expect(exportFileName(new Date("2026-10-05T12:00:00Z"))).toBe("bluememo-data-2026-10-05.json");
  });
});
