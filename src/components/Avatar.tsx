import { defaultAvatarFor, presetAvatarFor } from "@/lib/avatars";
import { AVATAR_ART } from "./AvatarArt";

/**
 * A profile picture: an uploaded photo, one of the ready-made pictures ("avatar:<id>"), or — with no
 * picture at all — a ready-made one picked from `seed` (the user's id), falling back to their initial.
 */
export function Avatar({ url, name, size = 40, seed }: { url: string | null; name: string | null; size?: number; seed?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  const preset = presetAvatarFor(url) ?? (!url && seed ? defaultAvatarFor(seed) : null);
  if (preset) {
    const art = AVATAR_ART[preset.id];
    return (
      <svg className="avatar avatar-preset" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="32" fill={preset.bg} />
        {art?.(preset.bg)}
      </svg>
    );
  }
  if (url) {
    // A small data URL stored on the profile, so next/image has nothing to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={url} alt="" style={style} />;
  }
  return (
    <span className="avatar avatar-initial" style={style} aria-hidden="true">
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}
