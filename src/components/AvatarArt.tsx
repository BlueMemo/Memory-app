import type { ReactElement } from "react";

// Drawings for the 25 ready-made profile pictures (lib/avatars.ts): memory-palace motifs in the site's
// own colours — paper, gold stars, brand blue and night blue — each on its avatar's background colour.

const P = "#ecebe6"; // paper
const G = "#f5c84c"; // star gold
const B = "#6f9cff"; // brand blue
const N = "#1e3a8a"; // night blue
const D = "#121417"; // ink

/** A five-pointed star centred on (cx, cy) with outer radius r. */
function star(cx: number, cy: number, r: number, fill = G) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  });
  return <polygon points={points.join(" ")} fill={fill} />;
}

/** Each drawing gets its avatar's background colour, for shapes that cut into others. */
export const AVATAR_ART: Record<string, (bg: string) => ReactElement> = {
  door: () => (
    <g>
      <path d="M22 50 V30 A10 10 0 0 1 42 30 V50 Z" fill={N} />
      {star(32, 34, 4)}
      <path d="M20 50 V30 A12 12 0 0 1 44 30 V50" fill="none" stroke={P} strokeWidth="4" strokeLinecap="round" />
      <path d="M14 51 H50" stroke={P} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  castle: (bg) => (
    <g fill={B}>
      <path d="M14 50 V30 h3 v-3 h4 v3 h3 V50 Z" />
      <path d="M40 50 V30 h3 v-3 h4 v3 h3 V50 Z" />
      <rect x="24" y="36" width="16" height="14" />
      <rect x="27" y="24" width="10" height="12" />
      <polygon points="26,24 32,14 38,24" />
      <path d="M29.5 50 V45 a2.5 2.5 0 0 1 5 0 V50 Z" fill={bg} />
    </g>
  ),
  stars: () => (
    <g>
      {star(21, 27, 8)}
      {star(43, 21, 6)}
      {star(36, 43, 10)}
    </g>
  ),
  moon: (bg) => (
    <g>
      <circle cx="29" cy="32" r="15" fill={P} />
      <circle cx="37" cy="26" r="13" fill={bg} />
      {star(45, 42, 4.5)}
    </g>
  ),
  key: () => (
    <g fill={G}>
      <circle cx="21" cy="32" r="9" fill="none" stroke={G} strokeWidth="4" />
      <rect x="29" y="30" width="22" height="4" rx="1" />
      <rect x="42" y="34" width="3.5" height="7" rx="1" />
      <rect x="47.5" y="34" width="3.5" height="5" rx="1" />
    </g>
  ),
  keyhole: () => (
    <g>
      <circle cx="32" cy="32" r="18" fill={P} />
      <circle cx="32" cy="27" r="5.5" fill={N} />
      <polygon points="29,30 35,30 37.5,44 26.5,44" fill={N} />
    </g>
  ),
  book: () => (
    <g>
      <path d="M11 22 Q21 18 31 22 V47 Q21 43 11 47 Z" fill={P} />
      <path d="M33 22 Q43 18 53 22 V47 Q43 43 33 47 Z" fill={P} />
      <path d="M15 28 H27 M15 33 H27 M37 28 H49 M37 33 H45" stroke={B} strokeWidth="1.8" strokeLinecap="round" />
      {star(32, 13, 5)}
    </g>
  ),
  scroll: () => (
    <g>
      <rect x="18" y="16" width="28" height="32" rx="2" fill={P} />
      <rect x="14" y="13" width="36" height="7" rx="3.5" fill={G} />
      <rect x="14" y="44" width="36" height="7" rx="3.5" fill={G} />
      <path d="M23 27 H41 M23 32 H41 M23 37 H35" stroke={N} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  quill: () => (
    <g>
      <path d="M46 10 C31 17 22 31 20 48 C29 40 41 30 46 10 Z" fill={P} />
      <path d="M44 14 C35 24 27 35 21 46" stroke={B} strokeWidth="1.5" fill="none" />
      <path d="M20 48 L15 55" stroke={G} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  owl: () => (
    <g>
      <path d="M21 27 L23 17 L28 24 Z M43 27 L41 17 L36 24 Z" fill={B} />
      <ellipse cx="32" cy="38" rx="13" ry="15" fill={B} />
      <ellipse cx="32" cy="44" rx="7" ry="7" fill={P} opacity="0.35" />
      <circle cx="26.5" cy="33" r="5" fill={P} />
      <circle cx="37.5" cy="33" r="5" fill={P} />
      <circle cx="26.8" cy="33.3" r="2.2" fill={D} />
      <circle cx="37.2" cy="33.3" r="2.2" fill={D} />
      <polygon points="30,37.5 34,37.5 32,41" fill={G} />
    </g>
  ),
  elephant: () => (
    <g fill="#c9cfd8">
      <ellipse cx="28" cy="40" rx="14" ry="10" />
      <rect x="18" y="44" width="5" height="10" rx="2" />
      <rect x="31" y="44" width="5" height="10" rx="2" />
      <circle cx="41" cy="31" r="9" />
      <path d="M48 33 Q54 43 48 51" fill="none" stroke="#c9cfd8" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="37" cy="31" rx="5" ry="7" fill="#9aa3b2" />
      <circle cx="44" cy="28" r="1.4" fill={D} />
      {star(18, 20, 4)}
    </g>
  ),
  lightbulb: () => (
    <g>
      <path d="M32 12 V7 M18 18 L15 15 M46 18 L49 15 M13 30 H9 M51 30 H55" stroke={G} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="29" r="12" fill={G} />
      <rect x="26.5" y="38" width="11" height="8" rx="1.5" fill={P} />
      <path d="M28 49.5 H36" stroke={P} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  bubble: () => (
    <g>
      <circle cx="35" cy="27" r="15" fill={P} />
      <circle cx="18" cy="46" r="4.5" fill={P} />
      <circle cx="11" cy="54" r="2.5" fill={P} />
      {star(35, 27, 7, N)}
    </g>
  ),
  lantern: () => (
    <g>
      <circle cx="32" cy="11" r="3" fill="none" stroke={P} strokeWidth="2" />
      <rect x="20" y="15" width="24" height="5" rx="2" fill={P} />
      <rect x="22" y="20" width="20" height="25" rx="3" fill={N} stroke={P} strokeWidth="2" />
      <ellipse cx="32" cy="33" rx="4" ry="6.5" fill={G} />
      <rect x="20" y="45" width="24" height="5" rx="2" fill={P} />
    </g>
  ),
  compass: () => (
    <g>
      <circle cx="32" cy="32" r="19" fill={P} />
      <circle cx="32" cy="32" r="15.5" fill={N} />
      <polygon points="32,18 36,32 28,32" fill={G} />
      <polygon points="32,46 36,32 28,32" fill={P} />
      <circle cx="32" cy="32" r="2" fill={D} />
    </g>
  ),
  map: () => (
    <g>
      <polygon points="11,19 23,15 41,20 53,16 53,47 41,51 23,46 11,50" fill={P} />
      <path d="M23 15 V46 M41 20 V51" stroke="#cfcac0" strokeWidth="1" />
      <path d="M17 41 Q26 27 34 35 T47 23" fill="none" stroke={B} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0.1 5" />
      {star(47, 22, 5)}
    </g>
  ),
  hourglass: () => (
    <g>
      <rect x="18" y="11" width="28" height="4" rx="2" fill={P} />
      <rect x="18" y="49" width="28" height="4" rx="2" fill={P} />
      <path d="M21 15 H43 L34 32 L43 49 H21 L30 32 Z" fill="none" stroke={P} strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points="24.5,18 39.5,18 32,29" fill={G} />
      <polygon points="26,47 38,47 32,40" fill={G} />
    </g>
  ),
  crown: () => (
    <g>
      <polygon points="13,44 13,24 23,33 32,17 41,33 51,24 51,44" fill={G} />
      <rect x="13" y="44" width="38" height="6" rx="1.5" fill={G} />
      <circle cx="22" cy="40" r="2.5" fill={B} />
      <circle cx="32" cy="37" r="3" fill={P} />
      <circle cx="42" cy="40" r="2.5" fill={B} />
    </g>
  ),
  crystal: () => (
    <g>
      <circle cx="32" cy="28" r="15" fill={B} />
      <circle cx="26" cy="22" r="4" fill={P} opacity="0.5" />
      {star(36, 31, 5, P)}
      <path d="M19 51 Q32 40 45 51 Z" fill={P} />
    </g>
  ),
  balloon: () => (
    <g>
      <path d="M32 9 C17 9 15 28 26 38 H38 C49 28 47 9 32 9 Z" fill={G} />
      <path d="M32 9 C26 17 26 30 29.5 38 H34.5 C38 30 38 17 32 9 Z" fill={B} />
      <path d="M27 38 L29 45 M37 38 L35 45" stroke={P} strokeWidth="1.5" />
      <rect x="28" y="45" width="8" height="6" rx="1" fill={P} />
    </g>
  ),
  lighthouse: () => (
    <g>
      <polygon points="38,15 57,9 57,21" fill={G} opacity="0.55" />
      <polygon points="26,15 7,9 7,21" fill={G} opacity="0.55" />
      <polygon points="26,13 32,8 38,13" fill={P} />
      <rect x="27" y="13" width="10" height="6" fill={G} />
      <polygon points="28,19 36,19 39,52 25,52" fill={P} />
      <polygon points="26.7,30 37.3,30 37.9,36 26.1,36" fill={B} />
      <polygon points="25.6,42 38.4,42 39,48 25,48" fill={B} />
    </g>
  ),
  mountain: () => (
    <g>
      <polygon points="7,51 26,21 36,36 42,28 57,51" fill={P} />
      <polygon points="22,27 26,21 30,27 27,30" fill={B} />
      <path d="M26 21 V10" stroke={G} strokeWidth="2" />
      <polygon points="26,10 35,13 26,16" fill={G} />
    </g>
  ),
  ajar: () => (
    <g>
      <polygon points="21,51 43,51 53,60 11,60" fill={G} opacity="0.35" />
      <rect x="21" y="14" width="22" height="37" fill={G} />
      {star(32, 30, 4, P)}
      <polygon points="43,14 51,10 51,57 43,51" fill={N} stroke={P} strokeWidth="1.5" />
      <rect x="21" y="14" width="22" height="37" fill="none" stroke={P} strokeWidth="3" />
      <circle cx="48" cy="34" r="1.5" fill={G} />
    </g>
  ),
  tree: () => (
    <g>
      <path d="M14 52 H50" stroke={P} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="29.5" y="34" width="5" height="18" rx="1.5" fill={P} />
      <path d="M32 42 L24 36 M32 39 L40 33" stroke={P} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="24" r="12" fill={B} />
      <circle cx="21" cy="31" r="8" fill={B} />
      <circle cx="43" cy="31" r="8" fill={B} />
      <circle cx="26" cy="22" r="2" fill={G} />
      <circle cx="38" cy="20" r="2" fill={G} />
      <circle cx="33" cy="31" r="2" fill={G} />
      <circle cx="20" cy="32" r="1.8" fill={G} />
    </g>
  ),
  route: () => (
    <g>
      <path d="M13 47 C24 47 21 31 32 31 S41 17 50 17" fill="none" stroke={P} strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 6.5" />
      <circle cx="13" cy="47" r="5" fill={P} />
      <circle cx="32" cy="31" r="5" fill={B} />
      {star(50, 17, 8)}
    </g>
  ),
};
