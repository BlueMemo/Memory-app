/** A profile photo, or the person's initial on a coloured circle when they haven't set one. */
export function Avatar({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
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
