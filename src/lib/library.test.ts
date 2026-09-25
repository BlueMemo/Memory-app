import { describe, expect, it } from "vitest";
import { parseIds, toggleId } from "./library";

describe("saved deck ids", () => {
  it("adds new saves first and removes existing ones", () => {
    expect(toggleId(["a"], "b")).toEqual(["b", "a"]);
    expect(toggleId(["b", "a"], "b")).toEqual(["a"]);
  });

  it("survives missing or damaged storage", () => {
    expect(parseIds(null)).toEqual([]);
    expect(parseIds("not json")).toEqual([]);
    expect(parseIds('{"a":1}')).toEqual([]);
    expect(parseIds('["a", 3, "b"]')).toEqual(["a", "b"]);
  });
});
