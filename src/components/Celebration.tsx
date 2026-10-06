"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { useI18n } from "@/i18n";
import { PRESET_AVATARS } from "@/lib/avatars";
import { celebrationById, pickCelebration, rarityOf, type Celebration as Variant, type Effect } from "@/lib/celebrations";
import { fill } from "@/lib/practice";
import { recordCelebration } from "@/lib/srs/store";
import { AVATAR_ART } from "./AvatarArt";
import { LogoArt } from "./LogoArt";

// The celebration after a deck's due cards are all done (lib/celebrations.ts picks which). A picture that
// pops in, a title and line of its own, a rarity badge for the uncommon ones, and drawn particles flying
// over the page. With reduced motion (system or the site setting) the particles stay hidden.

const GOLD = "#f5c84c";
const PAPER = "#ecebe6";
const BLUE = "#6f9cff";
const NIGHT = "#1e3a8a";
const GREEN = "#4cc185";
const CORAL = "#e5735a";
const PINK = "#f28cb1";
const LILAC = "#c4a7ff";
const ICE = "#b9cdff";

type Shape = "rect" | "star" | "sparkle" | "dot" | "glow" | "bubble" | "balloon" | "card" | "feather" | "heart" | "diamond" | "coin";
type Motion = "fall" | "rise" | "float" | "burst" | "twinkle";

interface Spec {
  shape: Shape;
  motion: Motion;
  colors: string[];
  count: number;
  /** Size range in px. */
  size: [number, number];
}

/** What flies for each effect; some effects combine several. */
const SPECS: Record<Effect, Spec[]> = {
  confetti: [{ shape: "rect", motion: "fall", colors: [BLUE, GOLD, PAPER, GREEN, CORAL], count: 80, size: [8, 14] }],
  stars: [{ shape: "star", motion: "fall", colors: [GOLD, PAPER], count: 45, size: [12, 26] }],
  balloons: [{ shape: "balloon", motion: "float", colors: [BLUE, GOLD, CORAL, GREEN, PINK], count: 18, size: [34, 54] }],
  fireworks: [{ shape: "dot", motion: "burst", colors: [GOLD, BLUE, PAPER, PINK], count: 90, size: [5, 8] }],
  sparkles: [{ shape: "sparkle", motion: "twinkle", colors: [GOLD, PAPER], count: 40, size: [12, 26] }],
  bubbles: [{ shape: "bubble", motion: "rise", colors: [BLUE, PAPER, ICE], count: 36, size: [16, 40] }],
  cards: [{ shape: "card", motion: "fall", colors: [PAPER], count: 28, size: [24, 36] }],
  fireflies: [{ shape: "glow", motion: "float", colors: [GOLD], count: 40, size: [6, 10] }],
  feathers: [{ shape: "feather", motion: "fall", colors: [PAPER, "#d9c7b0"], count: 24, size: [22, 34] }],
  hearts: [{ shape: "heart", motion: "rise", colors: [CORAL, PINK, BLUE], count: 30, size: [14, 26] }],
  rays: [{ shape: "sparkle", motion: "twinkle", colors: [GOLD, PAPER], count: 24, size: [10, 20] }],
  crystals: [
    { shape: "diamond", motion: "fall", colors: [ICE, LILAC, PAPER], count: 40, size: [12, 22] },
    { shape: "sparkle", motion: "twinkle", colors: [PAPER, ICE], count: 20, size: [10, 18] },
  ],
  gold: [
    { shape: "coin", motion: "fall", colors: [GOLD], count: 45, size: [16, 26] },
    { shape: "rect", motion: "fall", colors: [GOLD, "#e0a82e", PAPER], count: 50, size: [8, 12] },
  ],
  aurora: [{ shape: "star", motion: "twinkle", colors: [PAPER, GOLD], count: 60, size: [6, 14] }],
  legendary: [
    { shape: "rect", motion: "fall", colors: [GOLD, "#e0a82e", PAPER, BLUE], count: 110, size: [8, 14] },
    { shape: "dot", motion: "burst", colors: [GOLD, PAPER, BLUE], count: 120, size: [5, 9] },
    { shape: "star", motion: "twinkle", colors: [GOLD], count: 30, size: [12, 24] },
  ],
};

interface Particle {
  key: string;
  shape: Shape;
  motion: Motion;
  color: string;
  style: CSSProperties;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);
const pickOne = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

function makeParticles(effect: Effect): Particle[] {
  return SPECS[effect].flatMap((spec, s) => {
    // Fireworks go off in a few bursts, each from its own point and moment.
    const bursts = Array.from({ length: 6 }, () => ({ x: between(15, 85), y: between(12, 45), delay: between(0, 2.4) }));
    return Array.from({ length: spec.count }, (_, i) => {
      const size = between(...spec.size);
      const burst = bursts[i % bursts.length];
      const angle = between(0, Math.PI * 2);
      const reach = between(60, 190);
      const vars: Record<string, string> =
        spec.motion === "burst"
          ? {
              "--x": `${burst.x}%`,
              "--y": `${burst.y}%`,
              "--dx": `${Math.cos(angle) * reach}px`,
              "--dy": `${Math.sin(angle) * reach}px`,
              "--delay": `${burst.delay + between(0, 0.1)}s`,
              "--dur": `${between(1.1, 1.6)}s`,
            }
          : {
              "--x": `${between(0, 100)}%`,
              "--y": `${between(5, 90)}%`,
              "--dx": `${between(-120, 120)}px`,
              "--rot": `${between(-540, 540)}deg`,
              "--delay": `${between(0, spec.motion === "twinkle" ? 2.5 : 1.8)}s`,
              "--dur": `${spec.motion === "float" ? between(5, 8) : spec.motion === "twinkle" ? between(1.2, 2.2) : between(2.6, 4.6)}s`,
            };
      return {
        key: `${s}-${i}`,
        shape: spec.shape,
        motion: spec.motion,
        color: pickOne(spec.colors),
        style: { ...vars, width: size, height: spec.shape === "balloon" ? size * 1.6 : size } as CSSProperties,
      };
    });
  });
}

/** The particle drawings, all in a 20×20 box (balloons 20×32). */
function shapeArt(shape: Shape, color: string): ReactElement {
  switch (shape) {
    case "rect":
      return <rect x="5" y="2" width="10" height="16" rx="1.5" fill={color} />;
    case "star":
      return <path d="M10 1 L12.6 7.3 L19.5 7.6 L14.2 11.9 L16 18.6 L10 14.9 L4 18.6 L5.8 11.9 L0.5 7.6 L7.4 7.3 Z" fill={color} />;
    case "sparkle":
      return <path d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z" fill={color} />;
    case "dot":
      return <circle cx="10" cy="10" r="8" fill={color} />;
    case "glow":
      return <circle cx="10" cy="10" r="7" fill={color} />;
    case "bubble":
      return (
        <g fill="none" stroke={color} strokeWidth="1.4">
          <circle cx="10" cy="10" r="8.5" />
          <path d="M5.5 7.5 A5 5 0 0 1 9 4.5" strokeLinecap="round" />
        </g>
      );
    case "balloon":
      return (
        <g>
          <ellipse cx="10" cy="9" rx="8.5" ry="9" fill={color} />
          <path d="M8.6 17.6 L10 19.5 L11.4 17.6 Z" fill={color} />
          <path d="M10 19.5 C8 23 12 26 10 31" fill="none" stroke={PAPER} strokeWidth="0.8" />
          <ellipse cx="7" cy="6" rx="1.8" ry="2.8" fill="#ffffff" opacity="0.35" />
        </g>
      );
    case "card":
      return (
        <g>
          <rect x="2" y="1" width="16" height="18" rx="2" fill={color} />
          <path d="M5 7 H15 M5 11 H13" stroke={NIGHT} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
    case "feather":
      return (
        <g>
          <path d="M10 1 C16 6 15 14 10 19 C5 14 4 6 10 1 Z" fill={color} />
          <path d="M10 3 V19" stroke="#8a7a66" strokeWidth="0.8" />
        </g>
      );
    case "heart":
      return <path d="M10 18 C2 12 1 7 4 4.2 C6.5 2 9 3 10 5.2 C11 3 13.5 2 16 4.2 C19 7 18 12 10 18 Z" fill={color} />;
    case "diamond":
      return (
        <g>
          <path d="M10 1 L18 8 L10 19 L2 8 Z" fill={color} />
          <path d="M2 8 H18 M10 1 L7 8 L10 19 L13 8 Z" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
        </g>
      );
    case "coin":
      return (
        <g>
          <circle cx="10" cy="10" r="9" fill={color} />
          <circle cx="10" cy="10" r="6" fill="none" stroke="#c8961f" strokeWidth="1.3" />
        </g>
      );
  }
}

/** The big picture in the middle: a profile-picture drawing on its colour, or the logo on night ink. */
function Hero({ variant }: { variant: Variant }) {
  const bg = variant.art === "logo" ? "#121417" : (PRESET_AVATARS.find((a) => a.id === variant.art)?.bg ?? NIGHT);
  return (
    <div className={`celebration-hero effect-${variant.effect}`}>
      {(variant.effect === "rays" || variant.effect === "legendary") && <div className="celebration-rays" aria-hidden="true" />}
      <svg width="132" height="132" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="32" fill={bg} />
        {variant.art === "logo" ? <g transform="translate(6 3) scale(0.82)">{LogoArt({ frame: PAPER })}</g> : AVATAR_ART[variant.art]?.(bg)}
      </svg>
    </div>
  );
}

/** `id` shows a given one (the /celebrations preview page); otherwise one is drawn by its odds when it appears. */
export function Celebration({ id }: { id?: string }) {
  const { lang, t } = useI18n();
  const c = t.celebrations;
  const [variant] = useState<Variant>(() => celebrationById(id ?? null) ?? pickCelebration(Math.random()));
  const [particles] = useState(() => makeParticles(variant.effect));
  // A real one (not the preview page's) counts towards the celebration achievements, once.
  const recorded = useRef(false);
  useEffect(() => {
    if (id || recorded.current) return;
    recorded.current = true;
    void recordCelebration(variant.id);
  }, [id, variant.id]);
  const rarity = rarityOf(variant.weight);
  const text = c.items[variant.id as keyof typeof c.items];
  const chance =
    rarity === "legendary" ? c.legendaryChance : fill(c.chance, { p: variant.weight.toLocaleString(lang === "sv" ? "sv-SE" : "en-GB") });

  return (
    <div className={`celebration rarity-${rarity}`}>
      <div className="celebration-sky" aria-hidden="true">
        {variant.effect === "aurora" && <div className="celebration-aurora" />}
        {particles.map((p) => (
          <svg key={p.key} className={`cel-p cel-${p.motion} cel-${p.shape}`} style={p.style} viewBox={p.shape === "balloon" ? "0 0 20 32" : "0 0 20 20"}>
            {shapeArt(p.shape, p.color)}
          </svg>
        ))}
      </div>
      <Hero variant={variant} />
      {rarity !== "common" && (
        <p className="celebration-badge">
          {c.rarity[rarity]} · {chance}
        </p>
      )}
      <h2>{text.title}</h2>
      <p className="celebration-text">{text.text}</p>
    </div>
  );
}
