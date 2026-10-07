"use client";

import { useI18n } from "@/i18n";
import { LogoArt, STAR, STAR_PATH } from "./LogoArt";

// The loading screen: the BlueMemo doorway inside a ring of stars. A glowing line runs round the ring like a
// loading circle and each star lights up as it passes, while the logo's stars and a scatter of tiny stars in
// the sky behind the castle twinkle, so the page visibly keeps working rather than looking frozen.

/** Centre and radius of the ring, in the drawing's 400×260 units; the doorway is centred on it. */
const CX = 200;
const CY = 167;
const R = 76;
const RING_STARS = 12;
/** One lap of the glowing line, in seconds (keep in step with .loading-ring-head/.loading-ring-tail in CSS). */
const LAP = 2;
/** Length of the line's bright head, as a share of the ring (keep in step with its dasharray in CSS). */
const HEAD = 0.22;

/**
 * Tiny stars in the doorway's sky, in the logo's own 64×64 units: between the castle's towers and the three
 * big stars, so the whole sky behind the castle twinkles.
 */
const DOOR_STARS = [
  [22.5, 23.5, 0.55], [26.5, 17.8, 0.45], [37.5, 17.2, 0.5], [42, 22.2, 0.55], [20.6, 33, 0.5], [43.6, 32.6, 0.5],
  [27.4, 33.4, 0.4], [37.2, 32.2, 0.42], [28.6, 26, 0.38], [35.8, 26.4, 0.4], [24.8, 30.4, 0.35], [39.8, 29.4, 0.38],
  [31.9, 16.4, 0.35], [19.8, 28.4, 0.35], [44.2, 27.6, 0.35],
] as const;

export function LoadingScreen({ delayed = false }: { delayed?: boolean }) {
  const t = useI18n().t.loading;
  const ring = Array.from({ length: RING_STARS }, (_, i) => {
    // Starting at the top and going clockwise, like the line; each star lights up when the line's head reaches it.
    const angle = (i / RING_STARS) * 2 * Math.PI;
    const share = i / RING_STARS;
    return {
      x: CX + R * Math.sin(angle),
      y: CY - R * Math.cos(angle),
      delay: (((share - HEAD) % 1) + 1) % 1 * LAP,
    };
  });

  return (
    <div className={`loading-screen${delayed ? " delayed" : ""}`} role="status" aria-live="polite">
      <svg className="loading-art" viewBox="114 81 172 172" overflow="visible" aria-hidden="true">
        <defs>
          <filter id="loading-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>
        {/* The ring: a faint track, then the moving line as a soft glow under a crisp core and a fading tail.
            Rotated so it starts at the top. */}
        <g transform={`rotate(-90 ${CX} ${CY})`} fill="none" strokeLinecap="round">
          <circle cx={CX} cy={CY} r={R} stroke="#9db8ff" strokeOpacity={0.14} strokeWidth={1.2} />
          <circle className="loading-ring-tail" cx={CX} cy={CY} r={R} stroke="#9db8ff" strokeOpacity={0.35} strokeWidth={2} pathLength={100} />
          <circle className="loading-ring-head" cx={CX} cy={CY} r={R} stroke="#b9ccff" strokeWidth={7} filter="url(#loading-glow)" pathLength={100} />
          <circle className="loading-ring-head" cx={CX} cy={CY} r={R} stroke="#eef3ff" strokeWidth={2.2} pathLength={100} />
        </g>
        {ring.map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y}) scale(0.42)`}>
            <path className="ring-star" d={STAR_PATH} fill={STAR} style={{ animationDelay: `${s.delay}s` }} />
          </g>
        ))}
        {/* The doorway, centred on the ring, with tiny twinkling stars drawn into its sky. */}
        <g transform="translate(136 98) scale(2)">
          <LogoArt frame="#e8ecf7" starClass="twinkle" />
          {DOOR_STARS.map(([x, y, r], i) => (
            <circle key={i} className="door-star" cx={x} cy={y} r={r} fill="#fdf3cf" style={{ animationDelay: `${(i * 0.29) % 2.2}s` }} />
          ))}
        </g>
      </svg>
      <p className="loading-word" aria-hidden="true">
        <span className="logo-blue">Blue</span>Memo
      </p>
      <p className="loading-text">{t.label}</p>
    </div>
  );
}
