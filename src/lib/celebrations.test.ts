import { describe, expect, it } from "vitest";
import { CELEBRATIONS, pickCelebration, rarityOf } from "./celebrations";

describe("celebrations", () => {
  it("has 15 with chances adding up to 100%", () => {
    expect(CELEBRATIONS).toHaveLength(15);
    expect(CELEBRATIONS.reduce((sum, c) => sum + c.weight, 0)).toBeCloseTo(100, 10);
    expect(new Set(CELEBRATIONS.map((c) => c.id)).size).toBe(15);
  });

  it("has exactly one legendary, at 0.1%", () => {
    const legendary = CELEBRATIONS.filter((c) => rarityOf(c.weight) === "legendary");
    expect(legendary.map((c) => c.weight)).toEqual([0.1]);
  });

  it("picks by weight across the whole range", () => {
    expect(pickCelebration(0).id).toBe("confetti");
    expect(pickCelebration(0.1999).id).toBe("confetti");
    expect(pickCelebration(0.2).id).toBe("starfall");
    expect(pickCelebration(0.9989).id).toBe("aurora");
    expect(pickCelebration(0.9991).id).toBe("palace");
    expect(pickCelebration(0.999999999).id).toBe("palace");
  });

  it("matches the intended odds over many draws", () => {
    const counts = new Map<string, number>();
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const id = pickCelebration((i + 0.5) / n).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const c of CELEBRATIONS) expect((counts.get(c.id) ?? 0) / n).toBeCloseTo(c.weight / 100, 3);
  });
});
