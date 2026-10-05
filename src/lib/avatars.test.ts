import { describe, expect, it } from "vitest";
import { defaultAvatarFor, PRESET_AVATARS, presetAvatarFor, presetAvatarValue } from "./avatars";

describe("ready-made profile pictures", () => {
  it("has 25 different pictures", () => {
    expect(PRESET_AVATARS).toHaveLength(25);
    expect(new Set(PRESET_AVATARS.map((a) => a.id)).size).toBe(25);
  });

  it("reads a stored pick back, and ignores photos", () => {
    expect(presetAvatarFor(presetAvatarValue("fox"))?.emoji).toBe("🦊");
    expect(presetAvatarFor("data:image/jpeg;base64,abc")).toBeNull();
    expect(presetAvatarFor("avatar:nope")).toBeNull();
    expect(presetAvatarFor(null)).toBeNull();
  });

  it("gives everyone without a picture a stable one", () => {
    const id = "b1cd60f9-4b5a-4ab8-a4ae-09b5dd2870dc";
    expect(defaultAvatarFor(id)).toBe(defaultAvatarFor(id));
    const spread = new Set(Array.from({ length: 200 }, (_, i) => defaultAvatarFor(`user-${i}`).id));
    expect(spread.size).toBeGreaterThan(15);
  });
});
