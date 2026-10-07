// The BlueMemo symbol: an open doorway into your memory palace, with a fairy-tale night inside — a
// crenellated blue castle under three yellow stars. app/icon.svg and app/apple-icon.tsx draw the same
// picture on an ink tile, so change all three together. The night sky, castle and stars keep fixed
// colours (they're the logo's artwork); only the door frame follows the theme's ink colour.
export const SKY = "#1e3a8a";
export const CASTLE = "#6f9cff";
export const STAR = "#f5c84c";
export const STAR_PATH = "M0 -10 L2.35 -3.24 L9.51 -3.09 L3.8 1.24 L5.88 8.09 L0 4 L-5.88 8.09 L-3.8 1.24 L-9.51 -3.09 L-2.35 -3.24 Z";

/** The three stars above the castle: position and size. */
const STARS = [
  { x: 23, y: 28, s: 0.24 },
  { x: 32, y: 21, s: 0.3 },
  { x: 41, y: 27, s: 0.24 },
];

/**
 * Returns plain SVG elements (one <g>), so it can also be called as a function inside ImageResponse.
 * `starClass` (e.g. the loading screen's twinkle) goes on each star as `<starClass> <starClass>-1..3`; each star
 * sits in its own positioned group, so a CSS transform on the star scales it in place.
 */
export function LogoArt({ frame, starClass }: { frame: string; starClass?: string }) {
  return (
    <g>
      <path d="M18.5 56 V28 A13.5 13.5 0 0 1 45.5 28 V56 Z" fill={SKY} />
      <g fill={CASTLE}>
        <path d="M21 56 V40 H22.5 V38 H24 V40 H25 V38 H26.5 V40 H28 V56 Z" />
        <path d="M36 56 V40 H37.5 V38 H39 V40 H40 V38 H41.5 V40 H43 V56 Z" />
        <rect x="26" y="45" width="12" height="11" />
        <path d="M28.5 45 V36 H35.5 V45 Z" />
        <path d="M28 36 L32 29.5 L36 36 Z" />
      </g>
      <path d="M29.8 56 V51.5 A2.2 2.2 0 0 1 34.2 51.5 V56 Z" fill={SKY} />
      {STARS.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
          <path d={STAR_PATH} fill={STAR} className={starClass ? `${starClass} ${starClass}-${i + 1}` : undefined} />
        </g>
      ))}
      <path d="M16 56 V28 A16 16 0 0 1 48 28 V56" fill="none" stroke={frame} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M9 57.5 H55" stroke={frame} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}
