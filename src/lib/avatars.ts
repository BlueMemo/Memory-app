// 25 ready-made profile pictures (animals, landscapes, things) that learners can pick instead of uploading
// a photo. A pick is stored in `profiles.avatar_url` as "avatar:<id>"; someone with no picture at all gets
// one chosen from their user id, so everyone has a picture.

export interface PresetAvatar {
  id: string;
  emoji: string;
  /** Background colour of the circle. */
  bg: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "fox", emoji: "🦊", bg: "#3d5a80" },
  { id: "panda", emoji: "🐼", bg: "#5b8e7d" },
  { id: "owl", emoji: "🦉", bg: "#6d597a" },
  { id: "octopus", emoji: "🐙", bg: "#2a6f97" },
  { id: "turtle", emoji: "🐢", bg: "#b56576" },
  { id: "whale", emoji: "🐳", bg: "#e09f3e" },
  { id: "koala", emoji: "🐨", bg: "#457b9d" },
  { id: "penguin", emoji: "🐧", bg: "#bc4749" },
  { id: "butterfly", emoji: "🦋", bg: "#386641" },
  { id: "cat", emoji: "🐱", bg: "#7b2cbf" },
  { id: "mountain", emoji: "🏔️", bg: "#355070" },
  { id: "wave", emoji: "🌊", bg: "#f4a259" },
  { id: "island", emoji: "🏝️", bg: "#0081a7" },
  { id: "volcano", emoji: "🌋", bg: "#264653" },
  { id: "sunrise", emoji: "🌅", bg: "#5e548e" },
  { id: "galaxy", emoji: "🌌", bg: "#9e2a2b" },
  { id: "desert", emoji: "🏜️", bg: "#3a5a40" },
  { id: "forest", emoji: "🌲", bg: "#c75146" },
  { id: "rocket", emoji: "🚀", bg: "#14213d" },
  { id: "books", emoji: "📚", bg: "#588157" },
  { id: "lightbulb", emoji: "💡", bg: "#4361ee" },
  { id: "telescope", emoji: "🔭", bg: "#9c6644" },
  { id: "balloon", emoji: "🎈", bg: "#2b9348" },
  { id: "compass", emoji: "🧭", bg: "#e76f51" },
  { id: "key", emoji: "🗝️", bg: "#6a4c93" },
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
