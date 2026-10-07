"use client";

import { useI18n } from "@/i18n";
import { CASTLE, LogoArt, SKY, STAR, STAR_PATH } from "./LogoArt";

// A loading screen built on the BlueMemo symbol: the doorway into the memory palace, whose three stars
// twinkle so the page visibly is working rather than frozen. Three designs are being tried out on
// /loading-preview; the team picks one, and the others go.

export type LoadingVariant = "night" | "doorway" | "constellation";

/** Small background stars for the night sky: fixed positions (no randomness, so server and client agree). */
const SKY_STARS = [
  [22, 30, 1.1], [60, 70, 0.8], [95, 24, 1.3], [130, 58, 0.7], [168, 18, 1], [300, 26, 1.2], [334, 96, 0.8],
  [366, 20, 1], [382, 92, 0.7], [48, 120, 0.9], [352, 128, 1], [250, 52, 0.8], [210, 36, 0.6], [16, 84, 0.7],
  [276, 96, 0.6], [118, 104, 0.6], [150, 140, 0.7], [262, 136, 0.7],
] as const;

/** The constellation around the doorway (variant C): points on a loose arc, joined in order. */
const CONSTELLATION = [
  [96, 196], [84, 140], [112, 88], [164, 60], [236, 60], [288, 88], [316, 140], [304, 196],
] as const;

/** Where the symbol sits in the 400×260 drawing, and the part of the drawing each design shows around it. */
const LOGO_TRANSFORM = "translate(136 88) scale(2)";
const VIEW: Record<LoadingVariant, string> = {
  night: "130 76 140 148",
  doorway: "130 76 140 148",
  constellation: "60 36 280 196",
};

export function LoadingScreen({ variant = "night", fullScreen = true }: { variant?: LoadingVariant; fullScreen?: boolean }) {
  const t = useI18n().t.loading;
  return (
    <div className={`loading-screen loading-${variant}${fullScreen ? " full" : ""}`} role="status" aria-live="polite">
      {/* The night sky covers the whole screen behind the symbol, cropped to fit (it has no edges to show). */}
      {variant === "night" && (
        <svg className="loading-backdrop" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <NightSky />
        </svg>
      )}
      <svg className="loading-art" viewBox={VIEW[variant]} overflow="visible" aria-hidden="true">
        {variant === "constellation" && <Constellation />}
        {variant === "night" && <ellipse cx={200} cy={160} rx={78} ry={74} fill="url(#loading-night-mist)" />}
        {variant === "doorway" && <ellipse className="door-glow" cx={200} cy={160} rx={56} ry={64} fill={CASTLE} />}
        <g transform={LOGO_TRANSFORM}>
          <LogoArt frame={variant === "doorway" ? "var(--ink)" : "#e8ecf7"} starClass="twinkle" />
        </g>
      </svg>
      <p className="loading-word" aria-hidden="true">
        <span className="logo-blue">Blue</span>Memo
      </p>
      <p className="loading-text">{t.label}</p>
    </div>
  );
}

/** Variant A's backdrop: night sky with twinkling stars, a crescent moon and two layers of hills. */
function NightSky() {
  return (
    <>
      <defs>
        <linearGradient id="loading-night-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1640" />
          <stop offset="1" stopColor={SKY} />
        </linearGradient>
        <radialGradient id="loading-night-mist" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={CASTLE} stopOpacity="0.45" />
          <stop offset="1" stopColor={CASTLE} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={400} height={260} fill="url(#loading-night-sky)" />
      {SKY_STARS.map(([x, y, r], i) => (
        <circle key={i} className="sky-star" cx={x} cy={y} r={r} fill="#fdf3cf" style={{ animationDelay: `${(i * 0.37) % 2.4}s` }} />
      ))}
      {/* Crescent moon: a pale disc with a sky-coloured disc over one side. */}
      <circle cx={330} cy={50} r={16} fill="#fdf3cf" />
      <circle cx={337} cy={45} r={14} fill="#0e1b4d" />
      <path d="M0 214 Q70 178 140 202 T280 194 T400 206 V260 H0 Z" fill="#152a6b" />
      <path d="M0 236 Q90 212 200 222 T400 230 V260 H0 Z" fill="#0d1d52" />
    </>
  );
}

/** Variant C: a constellation drawing itself around the doorway; each point lights up as the line arrives. */
function Constellation() {
  const d = CONSTELLATION.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  return (
    <>
      <path className="constellation-line" d={d} fill="none" stroke="#9db8ff" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" pathLength={100} />
      {CONSTELLATION.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(0.45)`}>
          <path className="constellation-star" d={STAR_PATH} fill={STAR} style={{ animationDelay: `${(i / CONSTELLATION.length) * 3.2}s` }} />
        </g>
      ))}
    </>
  );
}
