// 25 ready-made profile pictures: memory-palace motifs (a palace door, castle, key, owl, an elephant that
// never forgets, the Memory Tree, ...) drawn in components/AvatarArt.tsx. A pick is stored in
// `profiles.avatar_url` as "avatar:<id>"; someone with no picture at all gets one chosen from their user
// id, so everyone has a picture.

export interface PresetAvatar {
  /** Also the key of its drawing in AVATAR_ART. */
  id: string;
  /** Background colour of the circle. */
  bg: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "door", bg: "#24476b" },
  { id: "castle", bg: "#3d348b" },
  { id: "stars", bg: "#1e3a8a" },
  { id: "moon", bg: "#2c3e50" },
  { id: "key", bg: "#5b3a7a" },
  { id: "keyhole", bg: "#0f5257" },
  { id: "book", bg: "#7a2e3a" },
  { id: "scroll", bg: "#3b5249" },
  { id: "quill", bg: "#4a3f6b" },
  { id: "owl", bg: "#5e3023" },
  { id: "elephant", bg: "#1b4965" },
  { id: "lightbulb", bg: "#40375c" },
  { id: "bubble", bg: "#2d6a4f" },
  { id: "lantern", bg: "#6d597a" },
  { id: "compass", bg: "#7b2d26" },
  { id: "map", bg: "#264653" },
  { id: "hourglass", bg: "#3a506b" },
  { id: "crown", bg: "#1d3557" },
  { id: "crystal", bg: "#4f3b78" },
  { id: "balloon", bg: "#355c7d" },
  { id: "lighthouse", bg: "#22577a" },
  { id: "mountain", bg: "#6b4226" },
  { id: "ajar", bg: "#0b525b" },
  { id: "tree", bg: "#2a4a3a" },
  { id: "route", bg: "#5a2a4a" },
];

const PREFIX = "avatar:";

export const presetAvatarValue = (id: string) => `${PREFIX}${id}`;

/** The ready-made picture a stored avatar value refers to, if it is one. */
export function presetAvatarFor(value: string | null | undefined): PresetAvatar | null {
  if (!value?.startsWith(PREFIX)) return null;
  return PRESET_AVATARS.find((a) => a.id === value.slice(PREFIX.length)) ?? null;
}

/** A stable picture for someone without one, picked from their id (or name). */
export function defaultAvatarFor(seed: string): PresetAvatar {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PRESET_AVATARS[hash % PRESET_AVATARS.length];
}
