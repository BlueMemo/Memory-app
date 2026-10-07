import type { ReactNode } from "react";
import type { IllustrationName } from "@/lib/types";

const INK = "#2b2118";
const line = { stroke: INK, strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const SNEAKER = {
  near: { body: "#d6453a", trim: "#e5675e", opening: "#7a221c", sole: "#f6f5f2" },
  // The far shoe of the pair is a shade darker, so it reads as sitting behind.
  far: { body: "#b8352c", trim: "#c9504a", opening: "#5e1914", sole: "#e3e1dc" },
};

/** A flat red-and-white sneaker in side view, heel left, toe right, standing on y = 0 of its own group. */
function Shoe({ x, y, shade }: { x: number; y: number; shade: keyof typeof SNEAKER }) {
  const c = SNEAKER[shade];
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M2 -4 L2 -13 Q2 -17 7 -17 L13 -17 Q16 -12 22 -11 L31 -9.5 Q38 -8 38.5 -4 Z" fill={c.body} />
      <path d="M29 -9.8 Q38 -8.2 38.5 -4 L29 -4 Z" fill={c.trim} />
      <path d="M2 -9 L2 -13 Q2 -17 6 -17 L6 -9 Z" fill={c.trim} />
      <path d="M16 -12.5 l2.3 -1.5 M19.5 -11.6 l2.3 -1.5 M23 -10.8 l2.3 -1.5" stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" />
      <ellipse cx={9.5} cy={-16.6} rx={5} ry={1.5} fill={c.opening} />
      <rect x={0} y={-5} width={39} height={5} rx={2} fill={c.sole} />
    </g>
  );
}

/**
 * A flat, plain wooden chopstick lying from (ax, ay) to (bx, by): thick at the a end, tapering to the tip
 * at b, with a darker strip along one side for shape.
 */
function LyingChopstick({ ax, ay, bx, by }: { ax: number; ay: number; bx: number; by: number }) {
  const len = Math.hypot(bx - ax, by - ay);
  const nx = -(by - ay) / len;
  const ny = (bx - ax) / len;
  const thick = 1.4;
  const tip = 0.6;
  const pt = (x: number, y: number, w: number) => `${x + nx * w},${y + ny * w}`;
  return (
    <>
      <polygon points={[pt(ax, ay, -thick), pt(bx, by, -tip), pt(bx, by, tip), pt(ax, ay, thick)].join(" ")} fill="#e6c48f" />
      <polygon points={[pt(ax, ay, 0), pt(bx, by, 0), pt(bx, by, tip), pt(ax, ay, thick)].join(" ")} fill="#c99c5e" />
    </>
  );
}

const drawings: Record<IllustrationName, { label: string; svg: ReactNode }> = {
  // Flat, no outlines (2026-10-07, modelled on a photo the team chose): a dark bowl of rice and tikka
  // masala, steaming, on the green doormat in front of a blue front door.
  "tikka-door": {
    label: "A steaming bowl of chicken tikka masala with rice, on the doormat in front of a blue front door",
    svg: (
      <>
        {/* Floor, door frame, door with two panels, brass letterbox and knob, threshold. */}
        <rect x={4} y={79} width={112} height={9} rx={2} fill="#dde1e7" />
        <rect x={56} y={4} width={50} height={76} rx={2} fill="#c9ced6" />
        <rect x={60} y={8} width={42} height={72} rx={1.5} fill="#2f5fbf" />
        <rect x={65} y={13} width={32} height={24} rx={1.5} fill="#3b6dd1" />
        <rect x={65} y={42} width={32} height={33} rx={1.5} fill="#3b6dd1" />
        <rect x={73} y={46} width={16} height={3} rx={1.5} fill="#e9b949" />
        <circle cx={96} cy={52} r={2.4} fill="#e9b949" />
        <rect x={54} y={77.5} width={54} height={3} rx={1} fill="#aab1bb" />
        {/* The doormat, green like the napkin in the photo, with a woven stripe. */}
        <path d="M20 79 H108 L113 87 H15 Z" fill="#7aa33a" />
        <path d="M22 82.5 H106" stroke="#5f8a2a" strokeWidth={1.4} />
        {/* Steam and bowl, moved down so the bowl stands on the doormat. */}
        <g transform="translate(0 7)">
        <path
          d="M36 33 q-3 -4 0 -8 q3 -4 0 -8 M46 30 q-3 -4 0 -8 q3 -4 0 -8 M56 33 q-3 -4 0 -8 q3 -4 0 -8"
          fill="none"
          stroke="#aeb4bd"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Bowl seen from above at an angle: the inside first, then rice and curry heaped above the rim, then the
            front of the bowl over their lower edge. */}
        <ellipse cx={46} cy={75.5} rx={24} ry={2.2} fill="#000" opacity={0.2} />
        <ellipse cx={46} cy={54} rx={27} ry={9} fill="#353941" />
        <path d="M21 57 Q21 40 33 38 Q46 37 51 47 L51 66 L23 66 Z" fill="#f6f4ef" />
        {[[28, 50, 20], [33, 45, -15], [39, 48, 10], [43, 43, 30], [30, 55, -25], [41, 54, 15], [36, 51, -5]].map(([cx, cy, r]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={1.8} ry={0.7} fill="#ddd8cd" transform={`rotate(${r} ${cx} ${cy})`} />
        ))}
        <path d="M36 66 Q38 52 46 46 Q53 39 61 40 Q71 42 72 56 L69 66 Z" fill="#de7a22" />
        {[
          [52, 46, 5, 3.6, "#f0973f"],
          [62, 45, 5.2, 3.6, "#c9641b"],
          [57, 52, 5, 3.4, "#e98a30"],
          [67, 51, 4.2, 3.1, "#f0973f"],
          [49, 54, 3.8, 2.8, "#c9641b"],
        ].map(([cx, cy, rx, ry, fill]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill as string} />
        ))}
        <path d="M48 48.5 q5 -2.6 10 0 q5 2.6 10 -0.8" fill="none" stroke="#fbe4c6" strokeWidth={1.5} strokeLinecap="round" />
        {[[56, 41.5, -30], [65, 48, 25], [51, 50, 40], [60, 55, -10]].map(([cx, cy, r]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={2} ry={1} fill="#4f9a3a" transform={`rotate(${r} ${cx} ${cy})`} />
        ))}
        <path d="M19 54 A27 9 0 0 0 73 54 Q71 74 46 75 Q21 74 19 54 Z" fill="#4b4f58" />
        <path d="M19 54 A27 9 0 0 0 73 54" fill="none" stroke="#6b717c" strokeWidth={1.6} />
        <path d="M25 63 Q29 70 38 72" fill="none" stroke="#5d626c" strokeWidth={2} strokeLinecap="round" />
        </g>
      </>
    ),
  },
  // Flat, no outlines, like the tikka masala (redrawn 2026-10-07, the team's choices): a pair of red-and-white
  // sneakers on top of an open wooden shoe shelf, with a pair of plain wooden chopsticks, at their real size,
  // laid across both shoes' openings. Side view, so the far shoe sits a little behind and above the near one.
  "shoes-chopsticks": {
    label: "A pair of red sneakers on a wooden shoe shelf, with a pair of wooden chopsticks laid across them",
    svg: (
      <>
        {/* Floor. */}
        <rect x={4} y={79} width={112} height={9} rx={2} fill="#dde1e7" />
        {/* Open two-level wooden shelf: side posts, then the boards with a darker front edge. */}
        <rect x={16} y={56} width={3.5} height={24} rx={1} fill="#9a6535" />
        <rect x={100.5} y={56} width={3.5} height={24} rx={1} fill="#9a6535" />
        <rect x={13} y={56} width={94} height={4.5} rx={1.2} fill="#b98049" />
        <rect x={13} y={59.3} width={94} height={1.2} fill="#95602f" />
        <rect x={13} y={72} width={94} height={4.5} rx={1.2} fill="#b98049" />
        <rect x={13} y={75.3} width={94} height={1.2} fill="#95602f" />
        {/* Shoes and chopsticks, enlarged 1.5× and centred on the top board, still standing on it. */}
        <g transform="translate(60 56) scale(1.5) translate(-57 -56)">
          {/* Soft shadow, then the far shoe, set back and up enough that both read as a pair. */}
          <ellipse cx={55} cy={56.3} rx={28} ry={1.1} fill="#000" opacity={0.15} />
          <Shoe x={44} y={53.5} shade="far" />
          <Shoe x={28} y={57} shade="near" />
          {/* The chopsticks rest on both shoes' openings (near at y≈40, far at y≈36.5), so they're drawn last.
              Real chopsticks are a little shorter than a sneaker. */}
          <LyingChopstick ax={24} ay={42.8} bx={57.5} by={35.2} />
          <LyingChopstick ax={27} ay={42.3} bx={60.5} by={35.9} />
        </g>
        {/* A little "look at that" spark beside them. */}
        <path d="M84 12 l4 -3 M86 20 h5 M84 28 l4 3" stroke="#e9b949" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  "nigeria-flag": {
    label: "The flag of Nigeria: green, white, green",
    svg: (
      <>
        <line x1={4} y1={84} x2={116} y2={84} {...line} />
        <line x1={24} y1={84} x2={24} y2={8} stroke="#6e3f17" strokeWidth={4} strokeLinecap="round" />
        <circle cx={24} cy={7} r={3.5} fill="#f2c14e" stroke={INK} strokeWidth={1.5} />
        <rect x={26} y={12} width={26} height={39} fill="#008751" />
        <rect x={52} y={12} width={26} height={39} fill="#ffffff" />
        <rect x={78} y={12} width={26} height={39} fill="#008751" />
        <rect x={26} y={12} width={78} height={39} fill="none" {...line} />
      </>
    ),
  },
};

/** The cartoon on its own, without a bubble (the landing page's route preview). */
export function Drawing({ name, className }: { name: IllustrationName; className?: string }) {
  const drawing = drawings[name];
  return (
    <svg viewBox="0 0 120 90" role="img" aria-label={drawing.label} className={className}>
      {drawing.svg}
    </svg>
  );
}

/** A cartoon in a thought bubble that sticks out of the top corner of a card. */
export function ThoughtBubble({ name, side = "right" }: { name: IllustrationName; side?: "left" | "right" }) {
  const drawing = drawings[name];
  return (
    <div className={`bubble bubble-${side}`}>
      <svg viewBox="0 0 120 90" role="img" aria-label={drawing.label}>
        {drawing.svg}
      </svg>
    </div>
  );
}
